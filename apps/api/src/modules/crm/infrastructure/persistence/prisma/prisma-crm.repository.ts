import { Inject, Injectable } from '@nestjs/common';
import {
  formatProposalDocumentNumber,
  normalizeProposalTaxRateFraction,
} from '@techwin/validation';
import { Decimal } from '@prisma/client/runtime/client';
import { Prisma } from '../../../../../generated/prisma/client.js';
import { PrismaService } from '../../../../../infrastructure/database/prisma.service.js';
import type { ProposalStatus } from '../../../domain/crm-types.js';
import {
  assignActiveStageOrders,
  compactActiveStageOrders,
  nextActiveStageSortOrder,
} from './pipeline-stage-order.js';
import {
  CrmConflictError,
  CrmNotFoundError,
  CrmPipelineInUseError,
  CrmStageDeleteBlockedError,
  CrmValidationError,
} from '../../../domain/errors/crm.errors.js';
import {
  computeLineItemTotals,
  computeProposalTotals,
  decimalToString,
} from '../../services/proposal-money.js';
import type {
  ClientRecord,
  CreateClientInput,
  PaginatedProposals,
  ProposalListFilters,
  CreateLeadActivityInput,
  CreateLeadInput,
  CreatePipelineInput,
  CreateProposalInput,
  ChangeServicePackageStatusInput,
  CreateServicePackageInput,
  CreateStageInput,
  CrmAuditInput,
  CrmRepository,
  LeadActivityRecord,
  LeadListFilters,
  LeadRecord,
  PaginatedLeads,
  PipelineRecord,
  PipelineStageRecord,
  ProposalLineItemWriteInput,
  ProposalRecord,
  ServicePackageRecord,
  UpdateClientInput,
  UpdateServicePackageInput,
  UpdateLeadInput,
  UpdatePipelineInput,
  UpdateProposalInput,
  UpdateStageInput,
} from '../../../domain/repositories/crm.repository.js';
import {
  buildPackageSnapshot,
  buildProposalLinesFromPackage,
  changeServicePackageStatus as changeServicePackageStatusRow,
  createServicePackage as createServicePackageRow,
  deleteServicePackage as deleteServicePackageRow,
  getServicePackage as getServicePackageRow,
  listServicePackages as listServicePackagesRows,
  nextServicePackageCode,
  previewServicePackageCode as previewServicePackageCodeRow,
  updateServicePackage as updateServicePackageRow,
} from './service-packages.persistence.js';
import {
  DEFAULT_ORGANIZATION_NAME,
  ORGANIZATION_SLUG_TECHWIN,
  SEQUENCE_KEYS,
} from '../../../domain/repositories/crm.repository.js';

const formatReference = (prefix: string, value: number): string =>
  `${prefix}-${String(value).padStart(6, '0')}`;

const DEFAULT_PIPELINE_NAME = 'Default Pipeline';

const pipelineStagesInclude = {
  orderBy: [
    { status: 'asc' },
    { sortOrder: 'asc' },
    { name: 'asc' },
  ] satisfies Prisma.PipelineStageOrderByWithRelationInput[],
  include: { _count: { select: { leads: true } } },
};

@Injectable()
export class PrismaCrmRepository implements CrmRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async ensureOrganizationForAdmin(adminId: string): Promise<{ organizationId: string }> {
    return this.prisma.$transaction(async (tx) => {
      const admin = await tx.platformAdmin.findUnique({
        where: { id: adminId },
        select: { organizationId: true },
      });
      if (!admin) throw new CrmNotFoundError('Administrator');
      if (admin.organizationId) return { organizationId: admin.organizationId };

      let organization = await tx.organization.findUnique({
        where: { slug: ORGANIZATION_SLUG_TECHWIN },
        select: { id: true },
      });
      if (!organization) {
        organization = await tx.organization.create({
          data: {
            id: crypto.randomUUID(),
            name: DEFAULT_ORGANIZATION_NAME,
            slug: ORGANIZATION_SLUG_TECHWIN,
          },
          select: { id: true },
        });
      }

      const linked = await tx.platformAdmin.updateMany({
        where: { id: adminId, organizationId: null },
        data: { organizationId: organization.id },
      });
      if (linked.count === 0) {
        const refreshed = await tx.platformAdmin.findUniqueOrThrow({
          where: { id: adminId },
          select: { organizationId: true },
        });
        if (!refreshed.organizationId) throw new CrmConflictError('Could not link organization.');
        return { organizationId: refreshed.organizationId };
      }
      return { organizationId: organization.id };
    });
  }

  private async nextSequence(
    tx: Pick<PrismaService, 'organizationSequence'>,
    organizationId: string,
    key: string,
  ): Promise<number> {
    const row = await tx.organizationSequence.upsert({
      where: { organizationId_key: { organizationId, key } },
      create: { organizationId, key, lastValue: 1 },
      update: { lastValue: { increment: 1 } },
      select: { lastValue: true },
    });
    return row.lastValue;
  }

  private async writeAudit(
    tx: Pick<PrismaService, 'crmAuditEvent'>,
    organizationId: string,
    audit: CrmAuditInput,
  ) {
    await tx.crmAuditEvent.create({
      data: {
        organizationId,
        adminId: audit.adminId,
        type: audit.type,
        entityType: audit.entityType,
        entityId: audit.entityId,
        metadata: audit.metadata ?? undefined,
      },
    });
  }

  async ensureDefaultPipeline(organizationId: string): Promise<PipelineRecord> {
    const existingDefault = await this.prisma.pipeline.findFirst({
      where: { organizationId, isDefault: true },
      include: { stages: pipelineStagesInclude },
    });
    if (existingDefault) return this.toPipeline(existingDefault);

    const fallback = await this.prisma.pipeline.findFirst({
      where: { organizationId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: { stages: pipelineStagesInclude },
    });

    if (fallback) {
      await this.prisma.$transaction([
        this.prisma.pipeline.updateMany({
          where: { organizationId },
          data: { isDefault: false },
        }),
        this.prisma.pipeline.update({
          where: { id: fallback.id },
          data: { isDefault: true },
        }),
      ]);
      return this.toPipeline({ ...fallback, isDefault: true });
    }

    const pipelineId = crypto.randomUUID();
    const created = await this.prisma.pipeline.create({
      data: {
        id: pipelineId,
        organizationId,
        name: DEFAULT_PIPELINE_NAME,
        description: '',
        status: 'ACTIVE',
        isDefault: true,
        sortOrder: 0,
      },
      include: { stages: pipelineStagesInclude },
    });
    return this.toPipeline(created);
  }

  async getDefaultPipeline(organizationId: string): Promise<PipelineRecord> {
    return this.ensureDefaultPipeline(organizationId);
  }

  async listPipelines(organizationId: string): Promise<readonly PipelineRecord[]> {
    await this.ensureDefaultPipeline(organizationId);
    const rows = await this.prisma.pipeline.findMany({
      where: { organizationId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: { stages: pipelineStagesInclude },
    });
    return rows.map((row) => this.toPipeline(row));
  }

  async getPipeline(organizationId: string, pipelineId: string): Promise<PipelineRecord | null> {
    const row = await this.prisma.pipeline.findFirst({
      where: { id: pipelineId, organizationId },
      include: { stages: pipelineStagesInclude },
    });
    return row ? this.toPipeline(row) : null;
  }

  async createPipeline(
    organizationId: string,
    input: CreatePipelineInput,
    audit: CrmAuditInput,
  ): Promise<PipelineRecord> {
    const pipelineId = crypto.randomUUID();
    const row = await this.prisma.$transaction(async (tx) => {
      const maxSort = await tx.pipeline.aggregate({
        where: { organizationId },
        _max: { sortOrder: true },
      });
      const hasDefault = await tx.pipeline.findFirst({
        where: { organizationId, isDefault: true },
        select: { id: true },
      });
      const pipeline = await tx.pipeline.create({
        data: {
          id: pipelineId,
          organizationId,
          name: input.name,
          description: input.description ?? '',
          status: input.status ?? 'ACTIVE',
          isDefault: !hasDefault,
          sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
        },
      });
      await this.writeAudit(tx, organizationId, { ...audit, entityId: pipeline.id });
      return tx.pipeline.findFirstOrThrow({
        where: { id: pipeline.id, organizationId },
        include: { stages: pipelineStagesInclude },
      });
    });
    return this.toPipeline(row);
  }

  async updatePipeline(
    organizationId: string,
    pipelineId: string,
    input: UpdatePipelineInput,
    audit: CrmAuditInput,
  ): Promise<PipelineRecord> {
    const existing = await this.getPipeline(organizationId, pipelineId);
    if (!existing) throw new CrmNotFoundError('Pipeline');
    const row = await this.prisma.$transaction(async (tx) => {
      await tx.pipeline.update({
        where: { id: pipelineId },
        data: {
          name: input.name,
          description: input.description,
          status: input.status,
          sortOrder: input.sortOrder,
        },
      });
      await this.writeAudit(tx, organizationId, audit);
      return tx.pipeline.findFirstOrThrow({
        where: { id: pipelineId, organizationId },
        include: { stages: pipelineStagesInclude },
      });
    });
    return this.toPipeline(row);
  }

  async deletePipeline(
    organizationId: string,
    pipelineId: string,
    audit: CrmAuditInput,
  ): Promise<void> {
    const leadCount = await this.prisma.lead.count({ where: { organizationId, pipelineId } });
    if (leadCount > 0) throw new CrmPipelineInUseError();
    const existing = await this.getPipeline(organizationId, pipelineId);
    if (!existing) throw new CrmNotFoundError('Pipeline');
    await this.prisma.$transaction(async (tx) => {
      await tx.pipelineStage.deleteMany({ where: { pipelineId, organizationId } });
      await tx.pipeline.delete({ where: { id: pipelineId } });
      await this.writeAudit(tx, organizationId, audit);
    });
  }

  async createStage(
    organizationId: string,
    pipelineId: string,
    input: CreateStageInput,
    audit: CrmAuditInput,
  ): Promise<PipelineStageRecord> {
    const pipeline = await this.getPipeline(organizationId, pipelineId);
    if (!pipeline) throw new CrmNotFoundError('Pipeline');
    await this.assertUniqueStageName(organizationId, pipelineId, input.name);
    const stageId = crypto.randomUUID();
    const row = await this.prisma.$transaction(async (tx) => {
      const sortOrder = await nextActiveStageSortOrder(tx, organizationId, pipelineId);
      const stage = await tx.pipelineStage.create({
        data: {
          id: stageId,
          organizationId,
          pipelineId,
          name: input.name,
          description: input.description ?? '',
          color: input.color ?? '#64748b',
          status: 'ACTIVE',
          outcome: input.outcome ?? 'NONE',
          sortOrder,
        },
      });
      await this.writeAudit(tx, organizationId, audit);
      return stage;
    });
    const leadCount = await this.prisma.lead.count({ where: { organizationId, stageId: row.id } });
    return this.toStage(row, leadCount);
  }

  async updateStage(
    organizationId: string,
    pipelineId: string,
    stageId: string,
    input: UpdateStageInput,
    audit: CrmAuditInput,
  ): Promise<PipelineStageRecord> {
    const stage = await this.prisma.pipelineStage.findFirst({
      where: { id: stageId, pipelineId, organizationId },
    });
    if (!stage) throw new CrmNotFoundError('Pipeline stage');
    if (input.status !== undefined && input.status !== stage.status) {
      throw new CrmValidationError('Use activate or deactivate to change stage status.');
    }
    if (input.name !== undefined && input.name !== stage.name) {
      await this.assertUniqueStageName(organizationId, pipelineId, input.name, stageId);
    }
    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.pipelineStage.update({
        where: { id: stageId },
        data: {
          name: input.name,
          description: input.description,
          color: input.color,
          outcome: input.outcome,
        },
      });
      await this.writeAudit(tx, organizationId, audit);
      return updated;
    });
    const leadCount = await this.prisma.lead.count({ where: { organizationId, stageId: row.id } });
    return this.toStage(row, leadCount);
  }

  async deleteStage(
    organizationId: string,
    pipelineId: string,
    stageId: string,
    targetStageId: string | undefined,
    audit: CrmAuditInput,
  ): Promise<void> {
    const stage = await this.prisma.pipelineStage.findFirst({
      where: { id: stageId, pipelineId, organizationId },
    });
    if (!stage) throw new CrmNotFoundError('Pipeline stage');

    const leadCount = await this.prisma.lead.count({
      where: { organizationId, stageId },
    });
    if (leadCount > 0) {
      if (stage.outcome === 'WON' || stage.outcome === 'LOST') {
        throw new CrmStageDeleteBlockedError(
          'Terminal stages with active leads cannot be deleted.',
        );
      }
      if (!targetStageId) {
        throw new CrmValidationError(
          'targetStageId is required to reassign leads before deleting this stage.',
        );
      }
      const target = await this.prisma.pipelineStage.findFirst({
        where: { id: targetStageId, pipelineId, organizationId, status: 'ACTIVE' },
      });
      if (!target) throw new CrmNotFoundError('Target pipeline stage');
      if (target.id === stageId) {
        throw new CrmValidationError('targetStageId must differ from the stage being deleted.');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      if (leadCount > 0 && targetStageId) {
        await tx.lead.updateMany({
          where: { organizationId, stageId },
          data: { stageId: targetStageId },
        });
      }
      await tx.pipelineStage.delete({ where: { id: stageId } });
      await compactActiveStageOrders(tx, organizationId, pipelineId);
      await this.writeAudit(tx, organizationId, audit);
    });
  }

  async activateStage(
    organizationId: string,
    pipelineId: string,
    stageId: string,
    audit: CrmAuditInput,
  ): Promise<PipelineStageRecord> {
    const stage = await this.prisma.pipelineStage.findFirst({
      where: { id: stageId, pipelineId, organizationId },
    });
    if (!stage) throw new CrmNotFoundError('Pipeline stage');
    if (stage.status === 'ACTIVE') {
      const leadCount = await this.prisma.lead.count({ where: { organizationId, stageId } });
      return this.toStage(stage, leadCount);
    }

    const row = await this.prisma.$transaction(async (tx) => {
      const sortOrder = await nextActiveStageSortOrder(tx, organizationId, pipelineId);
      const updated = await tx.pipelineStage.update({
        where: { id: stageId },
        data: { status: 'ACTIVE', sortOrder },
      });
      await this.writeAudit(tx, organizationId, audit);
      return updated;
    });
    const leadCount = await this.prisma.lead.count({ where: { organizationId, stageId: row.id } });
    return this.toStage(row, leadCount);
  }

  async deactivateStage(
    organizationId: string,
    pipelineId: string,
    stageId: string,
    targetStageId: string | undefined,
    audit: CrmAuditInput,
  ): Promise<PipelineStageRecord> {
    const stage = await this.prisma.pipelineStage.findFirst({
      where: { id: stageId, pipelineId, organizationId },
    });
    if (!stage) throw new CrmNotFoundError('Pipeline stage');
    if (stage.status === 'INACTIVE') {
      const leadCount = await this.prisma.lead.count({ where: { organizationId, stageId } });
      return this.toStage(stage, leadCount);
    }

    const leadCount = await this.prisma.lead.count({ where: { organizationId, stageId } });
    if (leadCount > 0) {
      if (!targetStageId) {
        throw new CrmValidationError(
          'targetStageId is required to reassign leads before deactivating this stage.',
        );
      }
      const target = await this.prisma.pipelineStage.findFirst({
        where: {
          id: targetStageId,
          pipelineId,
          organizationId,
          status: 'ACTIVE',
          NOT: { id: stageId },
        },
      });
      if (!target) {
        throw new CrmValidationError(
          'Choose another active stage to move leads before deactivating this stage.',
        );
      }
    }

    const row = await this.prisma.$transaction(async (tx) => {
      if (leadCount > 0 && targetStageId) {
        await tx.lead.updateMany({
          where: { organizationId, stageId },
          data: { stageId: targetStageId },
        });
      }
      const updated = await tx.pipelineStage.update({
        where: { id: stageId },
        data: { status: 'INACTIVE', sortOrder: 0 },
      });
      await compactActiveStageOrders(tx, organizationId, pipelineId);
      await this.writeAudit(tx, organizationId, audit);
      return updated;
    });
    const updatedLeadCount = await this.prisma.lead.count({
      where: { organizationId, stageId: row.id },
    });
    return this.toStage(row, updatedLeadCount);
  }

  async reorderStages(
    organizationId: string,
    pipelineId: string,
    orderedStageIds: readonly string[],
    audit: CrmAuditInput,
  ): Promise<readonly PipelineStageRecord[]> {
    const activeStages = await this.prisma.pipelineStage.findMany({
      where: { organizationId, pipelineId, status: 'ACTIVE' },
      select: { id: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    const activeIds = new Set(activeStages.map((stage) => stage.id));
    if (orderedStageIds.length !== activeIds.size) {
      throw new CrmValidationError('Stage reorder must include every active stage exactly once.');
    }
    const seen = new Set<string>();
    for (const id of orderedStageIds) {
      if (!activeIds.has(id)) throw new CrmNotFoundError('Pipeline stage');
      if (seen.has(id)) {
        throw new CrmValidationError('Stage reorder contains duplicate stage identifiers.');
      }
      seen.add(id);
    }

    await this.prisma.$transaction(async (tx) => {
      await assignActiveStageOrders(tx, orderedStageIds);
      await this.writeAudit(tx, organizationId, audit);
    });

    const rows = await this.prisma.pipelineStage.findMany({
      where: { organizationId, pipelineId, status: 'ACTIVE' },
      orderBy: { sortOrder: 'asc' },
    });
    const counts = await this.prisma.lead.groupBy({
      by: ['stageId'],
      where: { organizationId, stageId: { in: rows.map((row) => row.id) } },
      _count: { _all: true },
    });
    const countByStage = new Map(counts.map((item) => [item.stageId, item._count._all]));
    return rows.map((row) => this.toStage(row, countByStage.get(row.id) ?? 0));
  }

  async listLeads(organizationId: string, filters: LeadListFilters): Promise<PaginatedLeads> {
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
      items: items.map((row) => this.toLead(row)),
      total,
      page: filters.page,
      pageSize: filters.pageSize,
    };
  }

  async getLead(organizationId: string, leadId: string): Promise<LeadRecord | null> {
    const row = await this.prisma.lead.findFirst({ where: { id: leadId, organizationId } });
    return row ? this.toLead(row) : null;
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
    const row = await this.prisma.$transaction(async (tx) => {
      const seq = await this.nextSequence(tx, organizationId, SEQUENCE_KEYS.lead);
      const referenceNumber = formatReference('LD', seq);
      const kanbanSortOrder = await this.nextKanbanSortOrder(tx, organizationId, stageId);
      const lead = await tx.lead.create({
        data: {
          id: leadId,
          organizationId,
          referenceNumber,
          fullName: input.fullName,
          companyName: input.companyName ?? '',
          email: input.email ?? null,
          phone: input.phone ?? null,
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
      await this.writeAudit(tx, organizationId, { ...audit, entityId: lead.id });
      return lead;
    });
    return this.toLead(row);
  }

  async updateLead(
    organizationId: string,
    leadId: string,
    input: UpdateLeadInput,
    audit: CrmAuditInput,
  ): Promise<LeadRecord> {
    const existing = await this.getLead(organizationId, leadId);
    if (!existing) throw new CrmNotFoundError('Lead');

    if (input.pipelineId || input.stageId) {
      const pipelineId = input.pipelineId ?? existing.pipelineId;
      const stageId = input.stageId ?? existing.stageId;
      const stage = await this.prisma.pipelineStage.findFirst({
        where: { id: stageId, pipelineId, organizationId },
      });
      if (!stage) throw new CrmNotFoundError('Pipeline stage');
      if (stage.status !== 'ACTIVE') {
        throw new CrmValidationError('Leads can only be assigned to active pipeline stages.');
      }
    }

    const row = await this.prisma.$transaction(async (tx) => {
      const lead = await tx.lead.update({
        where: { id: leadId },
        data: {
          fullName: input.fullName,
          companyName: input.companyName,
          email: input.email,
          phone: input.phone,
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
      await this.writeAudit(tx, organizationId, audit);
      return lead;
    });
    return this.toLead(row);
  }

  async deleteLead(organizationId: string, leadId: string, audit: CrmAuditInput): Promise<void> {
    const existing = await this.getLead(organizationId, leadId);
    if (!existing) throw new CrmNotFoundError('Lead');
    await this.prisma.$transaction(async (tx) => {
      await tx.leadActivity.deleteMany({ where: { leadId, organizationId } });
      await tx.lead.delete({ where: { id: leadId } });
      await this.writeAudit(tx, organizationId, audit);
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
    const lead = await this.getLead(organizationId, leadId);
    if (!lead) throw new CrmNotFoundError('Lead');

    const stage = await this.prisma.pipelineStage.findFirst({
      where: { id: stageId, pipelineId: lead.pipelineId, organizationId },
    });
    if (!stage) throw new CrmNotFoundError('Pipeline stage');
    if (stage.status !== 'ACTIVE') {
      throw new CrmValidationError('Leads can only be moved to active pipeline stages.');
    }

    const destinationLeadIds = await this.listStageLeadIds(organizationId, stageId);
    const withoutActive = destinationLeadIds.filter((id) => id !== leadId);
    const insertIndex = this.resolveKanbanInsertIndex(withoutActive, beforeLeadId);
    const nextDestinationIds = [...withoutActive];
    nextDestinationIds.splice(insertIndex, 0, leadId);

    const stageChanged = lead.stageId !== stageId;
    const sourceStageId = lead.stageId;
    if (!stageChanged && this.sameLeadIdOrder(destinationLeadIds, nextDestinationIds)) {
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
        await this.applyKanbanOrder(tx, organizationId, sourceStageId, sourceIds);
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
      await this.applyKanbanOrder(tx, organizationId, stageId, nextDestinationIds);
      await this.writeAudit(tx, organizationId, audit);
      const updated = await tx.lead.findFirstOrThrow({ where: { id: leadId, organizationId } });
      return updated;
    });
    return this.toLead(row);
  }

  async listLeadActivities(
    organizationId: string,
    leadId: string,
  ): Promise<readonly LeadActivityRecord[]> {
    const lead = await this.getLead(organizationId, leadId);
    if (!lead) throw new CrmNotFoundError('Lead');
    const rows = await this.prisma.leadActivity.findMany({
      where: { organizationId, leadId },
      orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map((row) => this.toActivity(row));
  }

  async createLeadActivity(
    organizationId: string,
    leadId: string,
    input: CreateLeadActivityInput,
  ): Promise<LeadActivityRecord> {
    const lead = await this.getLead(organizationId, leadId);
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
    return this.toActivity(row);
  }

  async convertLeadToClient(
    organizationId: string,
    leadId: string,
    adminId: string,
    audit: CrmAuditInput,
  ): Promise<{ lead: LeadRecord; client: ClientRecord }> {
    const lead = await this.getLead(organizationId, leadId);
    if (!lead) throw new CrmNotFoundError('Lead');

    if (lead.convertedClientId) {
      const client = await this.getClient(organizationId, lead.convertedClientId);
      if (!client) throw new CrmNotFoundError('Client');
      return { lead, client };
    }

    const clientId = crypto.randomUUID();
    const now = new Date();
    const result = await this.prisma.$transaction(async (tx) => {
      const seq = await this.nextSequence(tx, organizationId, SEQUENCE_KEYS.client);
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
      await this.writeAudit(tx, organizationId, audit);
      return { lead: updatedLead, client };
    });
    return { lead: this.toLead(result.lead), client: this.toClient(result.client) };
  }

  async listClients(organizationId: string): Promise<readonly ClientRecord[]> {
    const rows = await this.prisma.client.findMany({
      where: { organizationId, archivedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => this.toClient(row));
  }

  async getClient(organizationId: string, clientId: string): Promise<ClientRecord | null> {
    const row = await this.prisma.client.findFirst({
      where: { id: clientId, organizationId },
    });
    return row ? this.toClient(row) : null;
  }

  async createClient(
    organizationId: string,
    input: CreateClientInput,
    audit: CrmAuditInput,
  ): Promise<ClientRecord> {
    const clientId = crypto.randomUUID();
    const row = await this.prisma.$transaction(async (tx) => {
      const seq = await this.nextSequence(tx, organizationId, SEQUENCE_KEYS.client);
      const referenceNumber = formatReference('CL', seq);
      const client = await tx.client.create({
        data: {
          id: clientId,
          organizationId,
          referenceNumber,
          type: input.type,
          name: input.name,
          primaryContact: input.primaryContact ?? '',
          email: input.email ?? null,
          phone: input.phone ?? null,
          website: input.website ?? null,
          billingAddress: input.billingAddress ?? '',
          taxRegistration: input.taxRegistration ?? '',
          status: input.status ?? 'ACTIVE',
          notes: input.notes ?? '',
          sourceLeadId: input.sourceLeadId ?? null,
          createdByAdminId: input.createdByAdminId,
        },
      });
      await this.writeAudit(tx, organizationId, { ...audit, entityId: client.id });
      return client;
    });
    return this.toClient(row);
  }

  async updateClient(
    organizationId: string,
    clientId: string,
    input: UpdateClientInput,
    audit: CrmAuditInput,
  ): Promise<ClientRecord> {
    const existing = await this.getClient(organizationId, clientId);
    if (!existing) throw new CrmNotFoundError('Client');
    const row = await this.prisma.$transaction(async (tx) => {
      const client = await tx.client.update({
        where: { id: clientId },
        data: {
          type: input.type,
          name: input.name,
          primaryContact: input.primaryContact,
          email: input.email,
          phone: input.phone,
          website: input.website,
          billingAddress: input.billingAddress,
          taxRegistration: input.taxRegistration,
          status: input.status,
          notes: input.notes,
          archivedAt: input.archivedAt,
        },
      });
      await this.writeAudit(tx, organizationId, audit);
      return client;
    });
    return this.toClient(row);
  }

  previewClientReference(organizationId: string): Promise<string> {
    return this.prisma.organizationSequence
      .findUnique({
        where: { organizationId_key: { organizationId, key: SEQUENCE_KEYS.client } },
        select: { lastValue: true },
      })
      .then((row) => formatReference('CL', (row?.lastValue ?? 0) + 1));
  }

  async deleteClient(
    organizationId: string,
    clientId: string,
    audit: CrmAuditInput,
  ): Promise<void> {
    const existing = await this.getClient(organizationId, clientId);
    if (!existing) throw new CrmNotFoundError('Client');
    await this.prisma.$transaction(async (tx) => {
      await tx.lead.updateMany({
        where: { organizationId, convertedClientId: clientId },
        data: { convertedClientId: null, convertedAt: null },
      });
      await tx.client.delete({ where: { id: clientId } });
      await this.writeAudit(tx, organizationId, { ...audit, entityId: clientId });
    });
  }

  async listProposals(
    organizationId: string,
    filters: ProposalListFilters,
  ): Promise<PaginatedProposals> {
    const where: Prisma.ProposalDocumentWhereInput = { organizationId };
    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;
    if (filters.search?.trim()) {
      const q = filters.search.trim();
      where.OR = [
        { documentNumber: { contains: q, mode: 'insensitive' } },
        { title: { contains: q, mode: 'insensitive' } },
        { clientName: { contains: q, mode: 'insensitive' } },
        { companyName: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (filters.issueFrom || filters.issueTo) {
      where.issueDate = {
        ...(filters.issueFrom ? { gte: new Date(`${filters.issueFrom}T00:00:00.000Z`) } : {}),
        ...(filters.issueTo ? { lte: new Date(`${filters.issueTo}T00:00:00.000Z`) } : {}),
      };
    }
    const page = filters.page;
    const pageSize = filters.pageSize;
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.proposalDocument.count({ where }),
      this.prisma.proposalDocument.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { lineItems: { orderBy: { sortOrder: 'asc' } } },
      }),
    ]);
    return {
      items: rows.map((row) => this.toProposal(row)),
      total,
      page,
      pageSize,
    };
  }

  async previewProposalDocumentNumber(
    organizationId: string,
    type: ProposalRecord['type'],
  ): Promise<string> {
    const seqKey = type === 'QUOTATION' ? SEQUENCE_KEYS.quotation : SEQUENCE_KEYS.proposal;
    const row = await this.prisma.organizationSequence.findUnique({
      where: { organizationId_key: { organizationId, key: seqKey } },
    });
    const next = (row?.lastValue ?? 0) + 1;
    return formatProposalDocumentNumber(type, next);
  }

  async deleteProposal(
    organizationId: string,
    proposalId: string,
    audit: CrmAuditInput,
  ): Promise<void> {
    const existing = await this.getProposal(organizationId, proposalId);
    if (!existing) throw new CrmNotFoundError('Proposal');
    if (existing.status !== 'DRAFT') {
      throw new CrmValidationError('Only draft documents can be deleted.');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.proposalDocument.delete({ where: { id: proposalId } });
      await this.writeAudit(tx, organizationId, audit);
    });
  }

  async getProposal(organizationId: string, proposalId: string): Promise<ProposalRecord | null> {
    const row = await this.prisma.proposalDocument.findFirst({
      where: { id: proposalId, organizationId },
      include: { lineItems: { orderBy: { sortOrder: 'asc' } } },
    });
    return row ? this.toProposal(row) : null;
  }

  private async assertProposalLinePackages(
    organizationId: string,
    items: readonly ProposalLineItemWriteInput[],
  ): Promise<void> {
    for (const item of items) {
      const packageId = item.sourcePackageId;
      if (!packageId) continue;
      const pkg = await getServicePackageRow(this.prisma, organizationId, packageId);
      if (!pkg) throw new CrmNotFoundError('Service package');
      if (pkg.status !== 'ACTIVE') throw new CrmValidationError('Service package is not active.');
    }
  }

  private buildLineItemRows(
    proposalId: string,
    items: readonly ProposalLineItemWriteInput[],
  ): {
    rows: Array<{
      id: string;
      proposalId: string;
      name: string;
      category: string;
      sourcePackageId: string | null;
      description: string;
      quantity: Decimal;
      unit: string;
      unitPrice: Decimal;
      discount: Decimal;
      taxRate: Decimal;
      lineTotal: Decimal;
      sortOrder: number;
    }>;
    totals: ReturnType<typeof computeProposalTotals>;
  } {
    const computed = items.map((item, index) => {
      const taxFraction = normalizeProposalTaxRateFraction(item.taxRate ?? 0);
      const totals = computeLineItemTotals({
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount ?? 0,
        taxRate: taxFraction,
      });
      return {
        id: item.id ?? crypto.randomUUID(),
        proposalId,
        name: item.name,
        category: item.category ?? '',
        sourcePackageId: item.sourcePackageId ?? null,
        description: item.description ?? '',
        quantity: totals.quantity,
        unit: item.unit ?? 'item',
        unitPrice: totals.unitPrice,
        discount: totals.discount,
        taxRate: totals.taxRate,
        lineTotal: totals.lineTotal,
        sortOrder: item.sortOrder ?? index,
      };
    });
    const totals = computeProposalTotals(computed);
    return { rows: computed, totals };
  }

  async createProposal(
    organizationId: string,
    input: CreateProposalInput,
    audit: CrmAuditInput,
  ): Promise<ProposalRecord> {
    const proposalId = crypto.randomUUID();
    let lineItems = input.lineItems ?? [];
    let packageSnapshot: unknown = null;
    const sourcePackageId = input.sourcePackageId ?? null;
    if (sourcePackageId && lineItems.length === 0) {
      const pkg = await getServicePackageRow(this.prisma, organizationId, sourcePackageId);
      if (!pkg) throw new CrmNotFoundError('Service package');
      if (pkg.status !== 'ACTIVE') throw new CrmValidationError('Service package is not active.');
      packageSnapshot = buildPackageSnapshot(pkg);
      const built = buildProposalLinesFromPackage(pkg);
      lineItems = built.lineItems;
    }
    if (input.clientId) {
      const client = await this.getClient(organizationId, input.clientId);
      if (!client) throw new CrmNotFoundError('Client');
    }
    await this.assertProposalLinePackages(organizationId, lineItems);
    const { rows, totals } = this.buildLineItemRows(proposalId, lineItems);

    const row = await this.prisma.$transaction(async (tx) => {
      const seqKey = input.type === 'QUOTATION' ? SEQUENCE_KEYS.quotation : SEQUENCE_KEYS.proposal;
      const seq = await this.nextSequence(tx, organizationId, seqKey);
      const documentNumber = formatProposalDocumentNumber(input.type, seq);

      const proposal = await tx.proposalDocument.create({
        data: {
          id: proposalId,
          organizationId,
          documentNumber,
          type: input.type,
          title: input.title,
          description: input.description ?? '',
          leadId: input.leadId ?? null,
          clientId: input.clientId ?? null,
          issueDate: input.issueDate,
          expiryDate: input.expiryDate ?? null,
          currency: input.currency ?? 'INR',
          subtotal: totals.subtotal,
          discountTotal: totals.discountTotal,
          taxTotal: totals.taxTotal,
          grandTotal: totals.grandTotal,
          notes: input.notes ?? '',
          terms: input.terms ?? '',
          scopeOfWork: input.scopeOfWork ?? '',
          paymentTerms: input.paymentTerms ?? '',
          deliveryTimeline: input.deliveryTimeline ?? '',
          clientName: input.clientName,
          companyName: input.companyName ?? '',
          clientPhone: input.clientPhone,
          clientEmail: input.clientEmail.toLowerCase(),
          billingAddress: input.billingAddress,
          clientGstin: (input.clientGstin ?? '').toUpperCase(),
          sourcePackageId,
          packageSnapshot:
            packageSnapshot === null ? Prisma.DbNull : (packageSnapshot as Prisma.InputJsonValue),
          createdByAdminId: input.createdByAdminId,
        },
      });
      if (rows.length > 0) {
        await tx.proposalLineItem.createMany({ data: rows });
      }
      if (input.leadId) {
        await tx.leadActivity.create({
          data: {
            id: crypto.randomUUID(),
            organizationId,
            leadId: input.leadId,
            type: 'PROPOSAL_CREATED',
            title: `Proposal ${documentNumber} created`,
            description: input.title,
            occurredAt: new Date(),
            metadata: { proposalId: proposal.id, sourcePackageId },
            createdByAdminId: input.createdByAdminId,
          },
        });
      }
      await this.writeAudit(tx, organizationId, { ...audit, entityId: proposal.id });
      return tx.proposalDocument.findFirstOrThrow({
        where: { id: proposal.id },
        include: { lineItems: { orderBy: { sortOrder: 'asc' } } },
      });
    });
    return this.toProposal(row);
  }

  async listServicePackages(organizationId: string): Promise<readonly ServicePackageRecord[]> {
    return listServicePackagesRows(this.prisma, organizationId);
  }

  async getServicePackage(
    organizationId: string,
    packageId: string,
  ): Promise<ServicePackageRecord | null> {
    return getServicePackageRow(this.prisma, organizationId, packageId);
  }

  previewServicePackageCode(organizationId: string): Promise<string> {
    return previewServicePackageCodeRow(this.prisma, organizationId);
  }

  async createServicePackage(
    organizationId: string,
    input: CreateServicePackageInput,
    audit: CrmAuditInput,
  ): Promise<ServicePackageRecord> {
    const row = await this.prisma.$transaction(async (tx) => {
      const code = await nextServicePackageCode(tx, organizationId);
      const created = await createServicePackageRow(tx, organizationId, input, code);
      await this.writeAudit(tx, organizationId, { ...audit, entityId: created.id });
      return created;
    });
    return row;
  }

  async changeServicePackageStatus(
    organizationId: string,
    packageId: string,
    input: ChangeServicePackageStatusInput,
    audit: CrmAuditInput,
  ): Promise<ServicePackageRecord> {
    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await changeServicePackageStatusRow(
        tx,
        organizationId,
        packageId,
        input.status,
      );
      await this.writeAudit(tx, organizationId, { ...audit, entityId: updated.id });
      return updated;
    });
    return row;
  }

  async updateServicePackage(
    organizationId: string,
    packageId: string,
    input: UpdateServicePackageInput,
    audit: CrmAuditInput,
  ): Promise<ServicePackageRecord> {
    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await updateServicePackageRow(tx, organizationId, packageId, input);
      await this.writeAudit(tx, organizationId, { ...audit, entityId: updated.id });
      return updated;
    });
    return row;
  }

  async deleteServicePackage(
    organizationId: string,
    packageId: string,
    audit: CrmAuditInput,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await deleteServicePackageRow(tx, organizationId, packageId);
      await this.writeAudit(tx, organizationId, audit);
    });
  }

  async updateProposal(
    organizationId: string,
    proposalId: string,
    input: UpdateProposalInput,
    audit: CrmAuditInput,
  ): Promise<ProposalRecord> {
    const existing = await this.getProposal(organizationId, proposalId);
    if (!existing) throw new CrmNotFoundError('Proposal');
    if (existing.status !== 'DRAFT') {
      throw new CrmValidationError('Only draft proposals can be edited.');
    }

    const lineItems = input.lineItems;
    let totals: ReturnType<typeof computeProposalTotals> = {
      subtotal: new Decimal(existing.subtotal),
      discountTotal: new Decimal(existing.discountTotal),
      taxTotal: new Decimal(existing.taxTotal),
      grandTotal: new Decimal(existing.grandTotal),
    };
    let rows: ReturnType<typeof this.buildLineItemRows>['rows'] | undefined;

    if (lineItems) {
      await this.assertProposalLinePackages(organizationId, lineItems);
      const built = this.buildLineItemRows(proposalId, lineItems);
      rows = built.rows;
      totals = built.totals;
    }

    const row = await this.prisma.$transaction(async (tx) => {
      await tx.proposalDocument.update({
        where: { id: proposalId },
        data: {
          title: input.title,
          description: input.description,
          scopeOfWork: input.scopeOfWork,
          leadId: input.leadId,
          clientId: input.clientId,
          clientName: input.clientName,
          companyName: input.companyName,
          clientPhone: input.clientPhone,
          clientEmail: input.clientEmail?.toLowerCase(),
          billingAddress: input.billingAddress,
          clientGstin: input.clientGstin?.toUpperCase(),
          issueDate: input.issueDate,
          expiryDate: input.expiryDate,
          currency: input.currency,
          notes: input.notes,
          terms: input.terms,
          paymentTerms: input.paymentTerms,
          deliveryTimeline: input.deliveryTimeline,
          subtotal: totals.subtotal,
          discountTotal: totals.discountTotal,
          taxTotal: totals.taxTotal,
          grandTotal: totals.grandTotal,
          version: { increment: 1 },
        },
      });
      if (rows) {
        await tx.proposalLineItem.deleteMany({ where: { proposalId } });
        if (rows.length > 0) await tx.proposalLineItem.createMany({ data: rows });
      }
      await this.writeAudit(tx, organizationId, audit);
      return tx.proposalDocument.findFirstOrThrow({
        where: { id: proposalId },
        include: { lineItems: { orderBy: { sortOrder: 'asc' } } },
      });
    });
    return this.toProposal(row);
  }

  private assertProposalStatusTransition(from: ProposalStatus, to: ProposalStatus): void {
    const allowed: Record<ProposalStatus, readonly ProposalStatus[]> = {
      DRAFT: ['SENT', 'CANCELLED'],
      SENT: ['ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED'],
      ACCEPTED: [],
      REJECTED: [],
      EXPIRED: [],
      CANCELLED: [],
    };
    if (!allowed[from].includes(to)) {
      throw new CrmValidationError(`Cannot change proposal status from ${from} to ${to}.`);
    }
  }

  async changeProposalStatus(
    organizationId: string,
    proposalId: string,
    toStatus: ProposalStatus,
    note: string,
    adminId: string,
    audit: CrmAuditInput,
  ): Promise<ProposalRecord> {
    const existing = await this.getProposal(organizationId, proposalId);
    if (!existing) throw new CrmNotFoundError('Proposal');
    if (existing.status === toStatus) return existing;
    this.assertProposalStatusTransition(existing.status, toStatus);

    const row = await this.prisma.$transaction(async (tx) => {
      const proposal = await tx.proposalDocument.update({
        where: { id: proposalId },
        data: { status: toStatus },
      });
      await tx.proposalStatusHistory.create({
        data: {
          proposalId,
          fromStatus: existing.status,
          toStatus,
          note,
          changedByAdminId: adminId,
        },
      });
      if (proposal.leadId) {
        await tx.leadActivity.create({
          data: {
            id: crypto.randomUUID(),
            organizationId,
            leadId: proposal.leadId,
            type: 'PROPOSAL_STATUS_CHANGE',
            title: `Proposal ${proposal.documentNumber} → ${toStatus}`,
            description: note,
            occurredAt: new Date(),
            metadata: { proposalId, fromStatus: existing.status, toStatus },
            createdByAdminId: adminId,
          },
        });
      }
      await this.writeAudit(tx, organizationId, audit);
      return tx.proposalDocument.findFirstOrThrow({
        where: { id: proposalId },
        include: { lineItems: { orderBy: { sortOrder: 'asc' } } },
      });
    });
    return this.toProposal(row);
  }

  async getProposalPrintData(
    organizationId: string,
    proposalId: string,
  ): Promise<ProposalRecord & { organizationName: string }> {
    const proposal = await this.getProposal(organizationId, proposalId);
    if (!proposal) throw new CrmNotFoundError('Proposal');
    const org = await this.prisma.organization.findFirstOrThrow({
      where: { id: organizationId },
      select: { name: true },
    });
    return { ...proposal, organizationName: org.name };
  }

  private async assertUniqueStageName(
    organizationId: string,
    pipelineId: string,
    name: string,
    excludeStageId?: string,
  ): Promise<void> {
    const existing = await this.prisma.pipelineStage.findFirst({
      where: {
        organizationId,
        pipelineId,
        name: { equals: name, mode: 'insensitive' },
        ...(excludeStageId ? { NOT: { id: excludeStageId } } : {}),
      },
      select: { id: true },
    });
    if (existing) {
      throw new CrmValidationError('A stage with this name already exists in the pipeline.');
    }
  }

  private toPipeline(row: {
    id: string;
    organizationId: string;
    name: string;
    description: string;
    status: PipelineRecord['status'];
    isDefault: boolean;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
    stages?: Array<{
      id: string;
      organizationId: string;
      pipelineId: string;
      name: string;
      description: string;
      color: string;
      status: PipelineStageRecord['status'];
      sortOrder: number;
      outcome: PipelineStageRecord['outcome'];
      createdAt: Date;
      updatedAt: Date;
      _count?: { leads: number };
    }>;
  }): PipelineRecord {
    return {
      id: row.id,
      organizationId: row.organizationId,
      name: row.name,
      description: row.description,
      status: row.status,
      isDefault: row.isDefault,
      sortOrder: row.sortOrder,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      stages: row.stages?.map((stage) => this.toStage(stage, stage._count?.leads ?? 0)),
    };
  }

  private toStage(
    row: {
      id: string;
      organizationId: string;
      pipelineId: string;
      name: string;
      description: string;
      color: string;
      status: PipelineStageRecord['status'];
      sortOrder: number;
      outcome: PipelineStageRecord['outcome'];
      createdAt: Date;
      updatedAt: Date;
    },
    leadCount = 0,
  ): PipelineStageRecord {
    return { ...row, leadCount };
  }

  private toLead(row: {
    id: string;
    organizationId: string;
    referenceNumber: string;
    fullName: string;
    companyName: string;
    email: string | null;
    phone: string | null;
    website: string | null;
    source: LeadRecord['source'];
    pipelineId: string;
    stageId: string;
    assignedAdminId: string | null;
    priority: LeadRecord['priority'];
    estimatedValue: Decimal;
    currency: string;
    expectedCloseDate: Date | null;
    nextFollowUpDate: Date | null;
    description: string;
    tags: string[];
    createdByAdminId: string;
    convertedClientId: string | null;
    convertedAt: Date | null;
    convertedByAdminId: string | null;
    archivedAt: Date | null;
    kanbanSortOrder: number;
    lastActivityAt: Date;
    createdAt: Date;
    updatedAt: Date;
  }): LeadRecord {
    return {
      ...row,
      estimatedValue: decimalToString(row.estimatedValue),
      tags: [...row.tags],
    };
  }

  private toActivity(row: {
    id: string;
    organizationId: string;
    leadId: string;
    type: LeadActivityRecord['type'];
    title: string;
    description: string;
    occurredAt: Date;
    dueAt: Date | null;
    completedAt: Date | null;
    metadata: unknown;
    createdByAdminId: string;
    createdAt: Date;
    updatedAt: Date;
  }): LeadActivityRecord {
    return { ...row };
  }

  private toClient(row: {
    id: string;
    organizationId: string;
    referenceNumber: string;
    type: ClientRecord['type'];
    name: string;
    primaryContact: string;
    email: string | null;
    phone: string | null;
    website: string | null;
    billingAddress: string;
    taxRegistration: string;
    status: ClientRecord['status'];
    notes: string;
    sourceLeadId: string | null;
    createdByAdminId: string;
    archivedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): ClientRecord {
    return { ...row };
  }

  private toProposal(row: {
    id: string;
    organizationId: string;
    documentNumber: string;
    type: ProposalRecord['type'];
    status: ProposalRecord['status'];
    title: string;
    description: string;
    leadId: string | null;
    clientId: string | null;
    issueDate: Date;
    expiryDate: Date | null;
    currency: string;
    subtotal: Decimal;
    discountTotal: Decimal;
    taxTotal: Decimal;
    grandTotal: Decimal;
    notes: string;
    terms: string;
    scopeOfWork: string;
    paymentTerms: string;
    deliveryTimeline: string;
    clientName: string;
    companyName: string;
    clientPhone: string;
    clientEmail: string;
    billingAddress: string;
    clientGstin: string;
    version: number;
    sourcePackageId: string | null;
    packageSnapshot: unknown;
    createdByAdminId: string;
    createdAt: Date;
    updatedAt: Date;
    lineItems?: Array<{
      id: string;
      proposalId: string;
      name: string;
      category: string;
      sourcePackageId: string | null;
      description: string;
      quantity: Decimal;
      unit: string;
      unitPrice: Decimal;
      discount: Decimal;
      taxRate: Decimal;
      lineTotal: Decimal;
      sortOrder: number;
      createdAt: Date;
      updatedAt: Date;
    }>;
  }): ProposalRecord {
    return {
      ...row,
      sourcePackageId: row.sourcePackageId ?? null,
      packageSnapshot: row.packageSnapshot ?? null,
      subtotal: decimalToString(row.subtotal),
      discountTotal: decimalToString(row.discountTotal),
      taxTotal: decimalToString(row.taxTotal),
      grandTotal: decimalToString(row.grandTotal),
      lineItems: row.lineItems?.map((item) => ({
        ...item,
        category: item.category ?? '',
        sourcePackageId: item.sourcePackageId ?? null,
        quantity: item.quantity.toFixed(4),
        unitPrice: decimalToString(item.unitPrice),
        discount: decimalToString(item.discount),
        taxRate: item.taxRate.toFixed(4),
        lineTotal: decimalToString(item.lineTotal),
      })),
    };
  }

  private async listStageLeadIds(organizationId: string, stageId: string): Promise<string[]> {
    const rows = await this.prisma.lead.findMany({
      where: { organizationId, stageId, archivedAt: null },
      orderBy: [{ kanbanSortOrder: 'asc' }, { createdAt: 'asc' }],
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }

  private resolveKanbanInsertIndex(orderedIds: readonly string[], beforeLeadId?: string | null): number {
    if (beforeLeadId === undefined || beforeLeadId === null) return orderedIds.length;
    const index = orderedIds.indexOf(beforeLeadId);
    return index < 0 ? orderedIds.length : index;
  }

  private sameLeadIdOrder(left: readonly string[], right: readonly string[]): boolean {
    return left.length === right.length && left.every((id, index) => id === right[index]);
  }

  private async nextKanbanSortOrder(
    tx: Prisma.TransactionClient,
    organizationId: string,
    stageId: string,
  ): Promise<number> {
    const max = await tx.lead.aggregate({
      where: { organizationId, stageId, archivedAt: null },
      _max: { kanbanSortOrder: true },
    });
    return (max._max.kanbanSortOrder ?? -1) + 1;
  }

  private async applyKanbanOrder(
    tx: Prisma.TransactionClient,
    organizationId: string,
    stageId: string,
    orderedLeadIds: readonly string[],
  ): Promise<void> {
    await Promise.all(
      orderedLeadIds.map((id, index) =>
        tx.lead.updateMany({
          where: { id, organizationId, stageId },
          data: { kanbanSortOrder: index },
        }),
      ),
    );
  }
}
