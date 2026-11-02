import { Decimal } from '@prisma/client/runtime/client';
import {
  normalizedLeadEmailOrNull,
  normalizedLeadPhoneOrNull,
} from '@techwin/validation';
import { CrmNotFoundError, CrmValidationError } from '../../../../domain/errors/crm.errors.js';
import { rethrowLeadContactUniqueViolation } from '../mappers/lead-contact-unique-violation.js';
import type {
  ClientRecord,
  CreateLeadActivityInput,
  CreateLeadInput,
  CrmAuditInput,
  LeadActivityRecord,
  LeadListFilters,
  LeadRecord,
  PaginatedLeads,
  UpdateLeadInput,
} from '../../../../domain/repositories/crm.repository.js';
import { SEQUENCE_KEYS } from '../../../../domain/repositories/crm.repository.js';
import {
  applyKanbanOrder,
  formatReference,
  listStageLeadIds,
  nextKanbanSortOrder,
  nextSequence,
  resolveKanbanInsertIndex,
  sameLeadIdOrder,
  toActivity,
  toClient,
  toLead,
  writeAudit,
  type CrmPersistenceHost,
} from './crm-persistence.shared.js';

export class CrmLeadPersistence {
  constructor(private readonly host: CrmPersistenceHost) {}

  private get prisma() {
    return this.host.prisma;
  }

  async listLeads(organizationId: string, filters: LeadListFilters): Promise<PaginatedLeads> {
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
      if (!pipeline) throw new CrmNotFoundError('Pipeline');
      if (!stage) {
        throw new CrmValidationError('The stage does not belong to the selected pipeline.');
      }
    } else if (filters.pipelineId) {
      const pipeline = await this.prisma.pipeline.findFirst({
        where: { id: filters.pipelineId, organizationId },
        select: { id: true },
      });
      if (!pipeline) throw new CrmNotFoundError('Pipeline');
    } else if (filters.stageId) {
      const stage = await this.prisma.pipelineStage.findFirst({
        where: {
          id: filters.stageId,
          organizationId,
        },
        select: { id: true },
      });
      if (!stage) {
        throw new CrmValidationError('Pipeline stage not found.');
      }
    }

    const where = {
      organizationId,
      ...(filters.includeArchived ? {} : { archivedAt: null }),
      ...(filters.pipelineId ? { pipelineId: filters.pipelineId } : {}),
      ...(filters.stageId ? { stageId: filters.stageId } : {}),
      ...(filters.assignedAdminId ? { assignedAdminId: filters.assignedAdminId } : {}),
      ...(filters.priority ? { priority: filters.priority } : {}),
      ...(filters.source ? { source: filters.source } : {}),
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
      items: items.map((row) => toLead(row)),
      total,
      page: filters.page,
      pageSize: filters.pageSize,
    };
  }

  async getLead(organizationId: string, leadId: string): Promise<LeadRecord | null> {
    const row = await this.prisma.lead.findFirst({ where: { id: leadId, organizationId } });
    return row ? toLead(row) : null;
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
    input: CreateLeadInput,
    audit: CrmAuditInput,
  ): Promise<LeadRecord> {
    const pipeline = await this.prisma.pipeline.findFirst({
      where: { id: input.pipelineId, organizationId },
    });
    if (!pipeline) throw new CrmNotFoundError('Pipeline');
    if (pipeline.status !== 'ACTIVE') {
      throw new CrmValidationError('Leads can only be created in an active pipeline.');
    }

    let stageId = input.stageId;
    if (!stageId) {
      const firstStage = await this.prisma.pipelineStage.findFirst({
        where: { organizationId, pipelineId: input.pipelineId, status: 'ACTIVE' },
        orderBy: { sortOrder: 'asc' },
      });
      if (!firstStage) {
        throw new CrmValidationError(
          'Configure at least one active pipeline stage before creating leads.',
        );
      }
      stageId = firstStage.id;
    } else {
      const stage = await this.prisma.pipelineStage.findFirst({
        where: { id: stageId, pipelineId: input.pipelineId, organizationId },
      });
      if (!stage) throw new CrmNotFoundError('Pipeline stage');
      if (stage.status !== 'ACTIVE') {
        throw new CrmValidationError('Leads can only be assigned to active pipeline stages.');
      }
    }

    const leadId = crypto.randomUUID();
    const phone = normalizedLeadPhoneOrNull(input.phone);
    const email = normalizedLeadEmailOrNull(input.email);
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
            subject: input.subject?.trim() ?? '',
            fullName: input.fullName,
            companyName: input.companyName ?? '',
            email,
            phone,
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
        await writeAudit(tx, organizationId, { ...audit, entityId: lead.id });
        return lead;
      });
    } catch (error) {
      rethrowLeadContactUniqueViolation(error);
    }
    return toLead(row);
  }

  async updateLead(
    organizationId: string,
    leadId: string,
    input: UpdateLeadInput,
    audit: CrmAuditInput,
  ): Promise<LeadRecord> {
    const existing = await this.host.getLead(organizationId, leadId);
    if (!existing) throw new CrmNotFoundError('Lead');

    if (input.pipelineId || input.stageId) {
      const pipelineId = input.pipelineId ?? existing.pipelineId;
      const stageId = input.stageId ?? existing.stageId;
      const [pipeline, stage] = await Promise.all([
        this.prisma.pipeline.findFirst({
          where: { id: pipelineId, organizationId },
          select: { status: true },
        }),
        this.prisma.pipelineStage.findFirst({
          where: { id: stageId, pipelineId, organizationId },
        }),
      ]);
      if (!pipeline) throw new CrmNotFoundError('Pipeline');
      if (pipeline.status !== 'ACTIVE') {
        throw new CrmValidationError('Leads can only be assigned to an active pipeline.');
      }
      if (!stage) {
        throw new CrmValidationError('The stage does not belong to the selected pipeline.');
      }
      if (stage.status !== 'ACTIVE') {
        throw new CrmValidationError('Leads can only be assigned to active pipeline stages.');
      }
    }

    const phone = input.phone !== undefined ? normalizedLeadPhoneOrNull(input.phone) : undefined;
    const email = input.email !== undefined ? normalizedLeadEmailOrNull(input.email) : undefined;
    let row;
    try {
      row = await this.prisma.$transaction(async (tx) => {
        const lead = await tx.lead.update({
          where: { id: leadId },
          data: {
            subject: input.subject !== undefined ? input.subject.trim() : undefined,
            fullName: input.fullName,
            companyName: input.companyName,
            email,
            phone,
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
        await writeAudit(tx, organizationId, audit);
        return lead;
      });
    } catch (error) {
      rethrowLeadContactUniqueViolation(error);
    }
    return toLead(row);
  }

  async deleteLead(organizationId: string, leadId: string, audit: CrmAuditInput): Promise<void> {
    const existing = await this.host.getLead(organizationId, leadId);
    if (!existing) throw new CrmNotFoundError('Lead');
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
    audit: CrmAuditInput,
  ): Promise<LeadRecord> {
    const lead = await this.host.getLead(organizationId, leadId);
    if (!lead) throw new CrmNotFoundError('Lead');

    const stage = await this.prisma.pipelineStage.findFirst({
      where: { id: stageId, pipelineId: lead.pipelineId, organizationId },
    });
    if (!stage) {
      throw new CrmValidationError("The target stage does not belong to this lead's pipeline.");
    }
    if (stage.status !== 'ACTIVE') {
      throw new CrmValidationError('Leads can only be moved to active pipeline stages.');
    }

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
        const sourceIds = sourceRows.map((row) => row.id).filter((id) => id !== leadId);
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
      const updated = await tx.lead.findFirstOrThrow({ where: { id: leadId, organizationId } });
      return updated;
    });
    return toLead(row);
  }

  async listLeadActivities(
    organizationId: string,
    leadId: string,
  ): Promise<readonly LeadActivityRecord[]> {
    const lead = await this.host.getLead(organizationId, leadId);
    if (!lead) throw new CrmNotFoundError('Lead');
    const rows = await this.prisma.leadActivity.findMany({
      where: { organizationId, leadId },
      orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map((row) => toActivity(row));
  }

  async createLeadActivity(
    organizationId: string,
    leadId: string,
    input: CreateLeadActivityInput,
  ): Promise<LeadActivityRecord> {
    const lead = await this.host.getLead(organizationId, leadId);
    if (!lead) throw new CrmNotFoundError('Lead');
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
    return toActivity(row);
  }

  async convertLeadToClient(
    organizationId: string,
    leadId: string,
    adminId: string,
    audit: CrmAuditInput,
  ): Promise<{ lead: LeadRecord; client: ClientRecord }> {
    const lead = await this.host.getLead(organizationId, leadId);
    if (!lead) throw new CrmNotFoundError('Lead');

    if (lead.convertedClientId) {
      const client = await this.host.getClient(organizationId, lead.convertedClientId);
      if (!client) throw new CrmNotFoundError('Client');
      return { lead, client };
    }

    const clientId = crypto.randomUUID();
    const now = new Date();
    const result = await this.prisma.$transaction(async (tx) => {
      const seq = await nextSequence(tx, organizationId, SEQUENCE_KEYS.client);
      const referenceNumber = formatReference('CL', seq);
      const client = await tx.client.create({
        data: {
          id: clientId,
          organizationId,
          referenceNumber,
          type: lead.companyName ? 'COMPANY' : 'INDIVIDUAL',
          name: lead.companyName || lead.fullName,
          primaryContact: lead.fullName,
          email: lead.email,
          phone: lead.phone,
          website: lead.website,
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
    return { lead: toLead(result.lead), client: toClient(result.client) };
  }
}
