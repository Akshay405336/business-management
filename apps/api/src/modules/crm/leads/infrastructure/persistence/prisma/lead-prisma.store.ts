import { Decimal } from '@prisma/client/runtime/client';
import type { ClientRecord } from '../../../../domain/repositories/crm.repository.js';
import { SEQUENCE_KEYS } from '../../../../domain/repositories/crm.repository.js';
import { rethrowLeadContactUniqueViolation } from '../../../../infrastructure/persistence/prisma/mappers/lead-contact-unique-violation.js';
import {
  applyKanbanOrder,
  formatReference,
  listStageLeadIds,
  nextKanbanSortOrder,
  nextSequence,
  resolveKanbanInsertIndex,
  sameLeadIdOrder,
  toClient,
  writeAudit,
  type CrmPersistenceHost,
} from '../../../../infrastructure/persistence/prisma/repositories/crm-persistence.shared.js';
import type { Lead } from '../../../domain/entities/lead.entity.js';
import type { LeadActivity } from '../../../domain/entities/lead-activity.entity.js';
import { LeadNotFoundError, LeadValidationError } from '../../../domain/errors/lead.errors.js';
import { LeadPipelineStagePolicy } from '../../../domain/policies/lead-pipeline-stage.policy.js';
import { LeadContactService } from '../../../domain/services/lead-contact.service.js';
import type {
  CreateLeadActivityData,
  CreateLeadData,
  LeadAuditEntry,
  LeadListFilters,
  PaginatedLeads,
  UpdateLeadData,
} from '../../../domain/types/lead.types.js';
import { leadActivityRowToDomain } from './mappers/lead-activity.mapper.js';
import { leadRowToDomain } from './mappers/lead.mapper.js';
import { LeadTagPrismaStore } from './lead-tag-prisma.store.js';
import type { LeadTagSnapshot } from '../../../domain/types/lead-read-model.js';
import type { CreateLeadTagData, LeadTagReadModel } from '../../../domain/types/lead-tag.types.js';
import type { LeadImportRowInput } from '../../../domain/types/lead-import.types.js';

export class LeadPrismaStore {
  private readonly tagStore: LeadTagPrismaStore;

  constructor(private readonly host: CrmPersistenceHost) {
    this.tagStore = new LeadTagPrismaStore(host);
  }

  private get prisma() {
    return this.host.prisma;
  }

  async listLeads(organizationId: string, filters: LeadListFilters): Promise<PaginatedLeads> {
    await this.assertListFilters(organizationId, filters);

    const where = {
      organizationId,
      ...(filters.includeArchived ? {} : { archivedAt: null }),
      ...(filters.pipelineId ? { pipelineId: filters.pipelineId } : {}),
      ...(filters.stageId ? { stageId: filters.stageId } : {}),
      ...(filters.assignedAdminId ? { assignedAdminId: filters.assignedAdminId } : {}),
      ...(filters.priority ? { priority: filters.priority } : {}),
      ...(filters.source ? { source: filters.source } : {}),
      ...(filters.tagIds?.length
        ? {
            OR: filters.tagIds.map((tagId) => ({
              tagAssignments: { some: { tagId } },
            })),
          }
        : {}),
      ...(filters.search
        ? {
            OR: [
              { fullName: { contains: filters.search, mode: 'insensitive' as const } },
              { companyName: { contains: filters.search, mode: 'insensitive' as const } },
              { email: { contains: filters.search, mode: 'insensitive' as const } },
              { referenceNumber: { contains: filters.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const skip = (filters.page - 1) * filters.pageSize;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.lead.findMany({
        where,
        orderBy: filters.kanbanOrder
          ? [{ kanbanSortOrder: 'asc' }, { createdAt: 'asc' }]
          : [{ lastActivityAt: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: filters.pageSize,
      }),
      this.prisma.lead.count({ where }),
    ]);
    return {
      items: items.map((row) => leadRowToDomain(row)),
      total,
      page: filters.page,
      pageSize: filters.pageSize,
    };
  }

  async getLead(organizationId: string, leadId: string): Promise<Lead | null> {
    const row = await this.prisma.lead.findFirst({ where: { id: leadId, organizationId } });
    return row ? leadRowToDomain(row) : null;
  }

  async findLeadIdByPhone(
    organizationId: string,
    phone: string,
    excludeLeadId?: string,
  ): Promise<string | null> {
    const row = await this.prisma.lead.findFirst({
      where: {
        organizationId,
        phone,
        ...(excludeLeadId ? { id: { not: excludeLeadId } } : {}),
      },
      select: { id: true },
    });
    return row?.id ?? null;
  }

  async findLeadIdByEmail(
    organizationId: string,
    email: string,
    excludeLeadId?: string,
  ): Promise<string | null> {
    const row = await this.prisma.lead.findFirst({
      where: {
        organizationId,
        email,
        ...(excludeLeadId ? { id: { not: excludeLeadId } } : {}),
      },
      select: { id: true },
    });
    return row?.id ?? null;
  }

  async createLead(
    organizationId: string,
    input: CreateLeadData,
    audit: LeadAuditEntry,
  ): Promise<Lead> {
    const pipeline = await this.prisma.pipeline.findFirst({
      where: { id: input.pipelineId, organizationId },
    });
    if (!pipeline) throw new LeadNotFoundError('Pipeline');
    LeadPipelineStagePolicy.assertActivePipelineForCreate({
      pipelineId: pipeline.id,
      pipelineStatus: pipeline.status,
    });

    let stageId = input.stageId;
    if (!stageId) {
      const firstStage = await this.prisma.pipelineStage.findFirst({
        where: { organizationId, pipelineId: input.pipelineId, status: 'ACTIVE' },
        orderBy: { sortOrder: 'asc' },
      });
      if (!firstStage) {
        throw new LeadValidationError(
          'Configure at least one active pipeline stage before creating leads.',
        );
      }
      stageId = firstStage.id;
    } else {
      const stage = await this.prisma.pipelineStage.findFirst({
        where: { id: stageId, pipelineId: input.pipelineId, organizationId },
      });
      if (!stage) throw new LeadNotFoundError('Pipeline stage');
      LeadPipelineStagePolicy.assertStageBelongsToPipeline(
        { stageId: stage.id, pipelineId: stage.pipelineId, stageStatus: stage.status },
        input.pipelineId,
      );
      LeadPipelineStagePolicy.assertActiveStage({
        stageId: stage.id,
        pipelineId: stage.pipelineId,
        stageStatus: stage.status,
      });
    }

    const leadId = crypto.randomUUID();
    const contact = LeadContactService.normalizeForPersistence({
      phone: input.phone,
      email: input.email,
    });
    let row;
    try {
      row = await this.prisma.$transaction(async (tx) => {
        const seq = await nextSequence(tx, organizationId, SEQUENCE_KEYS.lead);
        const referenceNumber = formatReference('LD', seq);
        const kanbanSortOrder = await nextKanbanSortOrder(tx, organizationId, stageId);
        const lead = await tx.lead.create({
          data: {
            id: leadId,
            organizationId,
            referenceNumber,
            fullName: input.fullName,
            companyName: input.companyName ?? '',
            email: contact.email ?? null,
            phone: contact.phone ?? null,
            website: input.website ?? null,
            source: input.source ?? 'OTHER',
            pipelineId: input.pipelineId,
            stageId,
            assignedAdminId: input.assignedAdminId ?? null,
            priority: input.priority ?? 'MEDIUM',
            estimatedValue: new Decimal(input.estimatedValue ?? 0),
            currency: input.currency ?? 'INR',
            expectedCloseDate: input.expectedCloseDate ?? null,
            nextFollowUpDate: input.nextFollowUpDate ?? null,
            description: input.description ?? '',
            tags: [...(input.tags ?? [])],
            kanbanSortOrder,
            createdByAdminId: input.createdByAdminId,
          },
        });
        await tx.leadActivity.create({
          data: {
            id: crypto.randomUUID(),
            organizationId,
            leadId: lead.id,
            type: 'NOTE',
            title: 'Lead created',
            description: '',
            occurredAt: new Date(),
            createdByAdminId: input.createdByAdminId,
          },
        });
        if (input.tagIds?.length) {
          await this.tagStore.syncLeadAssignments(tx, organizationId, lead.id, input.tagIds);
        }
        await writeAudit(tx, organizationId, { ...audit, entityId: lead.id });
        return lead;
      });
    } catch (error) {
      rethrowLeadContactUniqueViolation(error);
      throw error;
    }
    return leadRowToDomain(row);
  }

  async updateLead(
    organizationId: string,
    leadId: string,
    input: UpdateLeadData,
    audit: LeadAuditEntry,
  ): Promise<Lead> {
    const existing = await this.getLead(organizationId, leadId);
    if (!existing) throw new LeadNotFoundError('Lead');

    if (input.pipelineId || input.stageId) {
      const pipelineId = input.pipelineId ?? existing.pipelineId;
      const stageId = input.stageId ?? existing.stageId;
      const [pipeline, stage] = await Promise.all([
        this.prisma.pipeline.findFirst({
          where: { id: pipelineId, organizationId },
          select: { id: true, status: true },
        }),
        this.prisma.pipelineStage.findFirst({
          where: { id: stageId, pipelineId, organizationId },
          select: { id: true, pipelineId: true, status: true },
        }),
      ]);
      if (!pipeline) throw new LeadNotFoundError('Pipeline');
      LeadPipelineStagePolicy.assertActivePipelineForAssignment({
        pipelineId: pipeline.id,
        pipelineStatus: pipeline.status,
      });
      if (!stage) {
        throw new LeadValidationError('The stage does not belong to the selected pipeline.');
      }
      LeadPipelineStagePolicy.assertStageBelongsToPipeline(
        { stageId: stage.id, pipelineId: stage.pipelineId, stageStatus: stage.status },
        pipelineId,
      );
      LeadPipelineStagePolicy.assertActiveStage({
        stageId: stage.id,
        pipelineId: stage.pipelineId,
        stageStatus: stage.status,
      });
    }

    const contact = LeadContactService.normalizeForPersistence(input);
    let row;
    try {
      row = await this.prisma.$transaction(async (tx) => {
        const lead = await tx.lead.update({
          where: { id: leadId },
          data: {
            fullName: input.fullName,
            companyName: input.companyName,
            email: contact.email,
            phone: contact.phone,
            website: input.website,
            source: input.source,
            pipelineId: input.pipelineId,
            stageId: input.stageId,
            assignedAdminId: input.assignedAdminId,
            priority: input.priority,
            estimatedValue:
              input.estimatedValue !== undefined ? new Decimal(input.estimatedValue) : undefined,
            currency: input.currency,
            expectedCloseDate: input.expectedCloseDate,
            nextFollowUpDate: input.nextFollowUpDate,
            description: input.description,
            tags: input.tags ? [...input.tags] : undefined,
            archivedAt: input.archivedAt,
            lastActivityAt: new Date(),
          },
        });
        if (input.tagIds !== undefined) {
          await this.tagStore.syncLeadAssignments(tx, organizationId, leadId, input.tagIds);
        }
        await writeAudit(tx, organizationId, audit);
        return lead;
      });
    } catch (error) {
      rethrowLeadContactUniqueViolation(error);
      throw error;
    }
    return leadRowToDomain(row);
  }

  async deleteLead(organizationId: string, leadId: string, audit: LeadAuditEntry): Promise<void> {
    const existing = await this.getLead(organizationId, leadId);
    if (!existing) throw new LeadNotFoundError('Lead');
    await this.prisma.$transaction(async (tx) => {
      await tx.leadActivity.deleteMany({ where: { leadId, organizationId } });
      await tx.lead.delete({ where: { id: leadId } });
      await writeAudit(tx, organizationId, audit);
    });
  }

  async changeLeadStage(
    organizationId: string,
    leadId: string,
    stageId: string,
    beforeLeadId: string | null | undefined,
    adminId: string,
    audit: LeadAuditEntry,
  ): Promise<Lead> {
    const lead = await this.getLead(organizationId, leadId);
    if (!lead) throw new LeadNotFoundError('Lead');

    const stage = await this.prisma.pipelineStage.findFirst({
      where: { id: stageId, pipelineId: lead.pipelineId, organizationId },
    });
    if (!stage) {
      throw new LeadValidationError("The target stage does not belong to this lead's pipeline.");
    }
    LeadPipelineStagePolicy.assertStageMoveTarget(lead.pipelineId, {
      stageId: stage.id,
      pipelineId: stage.pipelineId,
      stageStatus: stage.status,
    });

    const destinationLeadIds = await listStageLeadIds(this.prisma, organizationId, stageId);
    const withoutActive = destinationLeadIds.filter((id) => id !== leadId);
    const insertIndex = resolveKanbanInsertIndex(withoutActive, beforeLeadId);
    const nextDestinationIds = [...withoutActive];
    nextDestinationIds.splice(insertIndex, 0, leadId);

    const stageChanged = lead.stageId !== stageId;
    const sourceStageId = lead.stageId;
    if (!stageChanged && sameLeadIdOrder(destinationLeadIds, nextDestinationIds)) {
      return lead;
    }

    const row = await this.prisma.$transaction(async (tx) => {
      if (stageChanged) {
        const sourceRows = await tx.lead.findMany({
          where: { organizationId, stageId: sourceStageId, archivedAt: null },
          orderBy: [{ kanbanSortOrder: 'asc' }, { createdAt: 'asc' }],
          select: { id: true },
        });
        const sourceIds = sourceRows.map((r) => r.id).filter((id) => id !== leadId);
        await applyKanbanOrder(tx, organizationId, sourceStageId, sourceIds);
        await tx.lead.update({
          where: { id: leadId },
          data: { stageId, lastActivityAt: new Date() },
        });
        await tx.leadActivity.create({
          data: {
            id: crypto.randomUUID(),
            organizationId,
            leadId,
            type: 'STAGE_CHANGE',
            title: `Moved to ${stage.name}`,
            description: '',
            occurredAt: new Date(),
            metadata: { fromStageId: sourceStageId, toStageId: stageId },
            createdByAdminId: adminId,
          },
        });
      }
      await applyKanbanOrder(tx, organizationId, stageId, nextDestinationIds);
      await writeAudit(tx, organizationId, audit);
      return tx.lead.findFirstOrThrow({ where: { id: leadId, organizationId } });
    });
    return leadRowToDomain(row);
  }

  async listLeadActivities(
    organizationId: string,
    leadId: string,
  ): Promise<readonly LeadActivity[]> {
    const lead = await this.getLead(organizationId, leadId);
    if (!lead) throw new LeadNotFoundError('Lead');
    const rows = await this.prisma.leadActivity.findMany({
      where: { organizationId, leadId },
      orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map((row) => leadActivityRowToDomain(row));
  }

  async createLeadActivity(
    organizationId: string,
    leadId: string,
    input: CreateLeadActivityData,
  ): Promise<LeadActivity> {
    const lead = await this.getLead(organizationId, leadId);
    if (!lead) throw new LeadNotFoundError('Lead');
    const row = await this.prisma.$transaction(async (tx) => {
      const activity = await tx.leadActivity.create({
        data: {
          id: crypto.randomUUID(),
          organizationId,
          leadId,
          type: input.type,
          title: input.title,
          description: input.description ?? '',
          occurredAt: input.occurredAt,
          dueAt: input.dueAt ?? null,
          completedAt: input.completedAt ?? null,
          metadata: input.metadata ?? undefined,
          createdByAdminId: input.createdByAdminId,
        },
      });
      await tx.lead.update({
        where: { id: leadId },
        data: { lastActivityAt: input.occurredAt },
      });
      return activity;
    });
    return leadActivityRowToDomain(row);
  }

  async convertLeadToClient(
    organizationId: string,
    leadId: string,
    adminId: string,
    audit: LeadAuditEntry,
  ): Promise<{ lead: Lead; client: ClientRecord }> {
    const lead = await this.getLead(organizationId, leadId);
    if (!lead) throw new LeadNotFoundError('Lead');

    if (lead.convertedClientId) {
      const client = await this.host.getClient(organizationId, lead.convertedClientId);
      if (!client) throw new LeadNotFoundError('Client');
      return { lead, client };
    }

    const clientId = crypto.randomUUID();
    const now = new Date();
    const readModel = lead.toReadModel();
    const result = await this.prisma.$transaction(async (tx) => {
      const seq = await nextSequence(tx, organizationId, SEQUENCE_KEYS.client);
      const referenceNumber = formatReference('CL', seq);
      const client = await tx.client.create({
        data: {
          id: clientId,
          organizationId,
          referenceNumber,
          type: readModel.companyName ? 'COMPANY' : 'INDIVIDUAL',
          name: readModel.companyName || readModel.fullName,
          primaryContact: readModel.fullName,
          email: readModel.email,
          phone: readModel.phone,
          website: readModel.website,
          sourceLeadId: leadId,
          createdByAdminId: adminId,
        },
      });
      const updatedLead = await tx.lead.update({
        where: { id: leadId },
        data: {
          convertedClientId: client.id,
          convertedAt: now,
          convertedByAdminId: adminId,
          lastActivityAt: now,
        },
      });
      await tx.leadActivity.create({
        data: {
          id: crypto.randomUUID(),
          organizationId,
          leadId,
          type: 'LEAD_CONVERTED',
          title: 'Lead converted to client',
          description: client.referenceNumber,
          occurredAt: now,
          metadata: { clientId: client.id },
          createdByAdminId: adminId,
        },
      });
      await writeAudit(tx, organizationId, audit);
      return { lead: updatedLead, client };
    });
    return { lead: leadRowToDomain(result.lead), client: toClient(result.client) };
  }

  private async assertListFilters(organizationId: string, filters: LeadListFilters): Promise<void> {
    if (filters.pipelineId && filters.stageId) {
      const [pipeline, stage] = await Promise.all([
        this.prisma.pipeline.findFirst({
          where: { id: filters.pipelineId, organizationId },
          select: { id: true },
        }),
        this.prisma.pipelineStage.findFirst({
          where: {
            id: filters.stageId,
            organizationId,
            pipelineId: filters.pipelineId,
          },
          select: { id: true },
        }),
      ]);
      if (!pipeline) throw new LeadNotFoundError('Pipeline');
      if (!stage) {
        throw new LeadValidationError('The stage does not belong to the selected pipeline.');
      }
    } else if (filters.pipelineId) {
      const pipeline = await this.prisma.pipeline.findFirst({
        where: { id: filters.pipelineId, organizationId },
        select: { id: true },
      });
      if (!pipeline) throw new LeadNotFoundError('Pipeline');
    } else if (filters.stageId) {
      const stage = await this.prisma.pipelineStage.findFirst({
        where: { id: filters.stageId, organizationId },
        select: { id: true },
      });
      if (!stage) {
        throw new LeadValidationError('Pipeline stage not found.');
      }
    }
  }

  loadTagsByLeadIds(organizationId: string, leadIds: readonly string[]) {
    return this.tagStore.loadTagsByLeadIds(organizationId, leadIds).then((map) => {
      const result = new Map<string, LeadTagSnapshot[]>();
      for (const [leadId, tags] of map) {
        result.set(
          leadId,
          tags.map((tag) => ({
            id: tag.id,
            name: tag.name,
            slug: tag.slug,
            color: tag.color,
            status: tag.status,
          })),
        );
      }
      return result;
    });
  }

  listLeadTags(organizationId: string, search?: string): Promise<LeadTagReadModel[]> {
    return this.tagStore.listTags(organizationId, search);
  }

  createLeadTag(organizationId: string, input: CreateLeadTagData): Promise<LeadTagReadModel> {
    return this.tagStore.createTag(organizationId, input);
  }

  resolveTagIdsByNames(organizationId: string, names: readonly string[]) {
    return this.tagStore.resolveTagIdsByNames(organizationId, names);
  }

  previewLeadImport(
    organizationId: string,
    pipelineId: string,
    rows: readonly LeadImportRowInput[],
  ) {
    return this.tagStore.previewImport(organizationId, pipelineId, rows);
  }

  executeLeadImport(
    organizationId: string,
    pipelineId: string,
    rows: readonly LeadImportRowInput[],
    adminId: string,
    audit: LeadAuditEntry,
  ) {
    return this.tagStore.executeImport(organizationId, pipelineId, rows, adminId, audit).then(
      (result) => ({
        totalRows: rows.length,
        ...result,
      }),
    );
  }
}
