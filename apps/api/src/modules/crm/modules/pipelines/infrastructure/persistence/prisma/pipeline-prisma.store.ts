import { PrismaService } from '../../../../../../../infrastructure/database/prisma.service.js';
import {
  assignActiveStageOrders,
  compactActiveStageOrders,
  nextActiveStageSortOrder,
} from '../../../../../shared/infrastructure/persistence/prisma/mappers/pipeline-stage-order.js';
import {
  PipelineHasDependentLeadsError,
  PipelineNotFoundError,
  PipelineStageDeleteBlockedError,
  PipelineValidationError,
} from '../../../domain/errors/pipeline.errors.js';
import type { Pipeline } from '../../../domain/entities/pipeline.entity.js';
import type { PipelineStage } from '../../../domain/entities/pipeline-stage.entity.js';
import type { PipelineListFilters } from '../../../domain/types/pipeline-filter.types.js';
import type {
  CreatePipelineData,
  CreateStageData,
  PipelineAuditEntry,
  PipelineStageInput,
  UpdatePipelineData,
  UpdateStageData,
} from '../../../domain/types/pipeline.types.js';
import { PipelineStageOrderService } from '../../../domain/services/pipeline-stage-order.service.js';
import { PipelineStageValidationService } from '../../../domain/services/pipeline-stage-validation.service.js';
import {
  type CrmPersistenceHost,
  pipelineStagesInclude,
  writeAudit,
} from '../../../../../shared/infrastructure/persistence/prisma/repositories/crm-persistence.shared.js';
import { pipelineRowToDomain } from './mappers/pipeline.mapper.js';
import { pipelineStageRowToDomain } from './mappers/pipeline-stage.mapper.js';

export class PipelinePrismaStore {
  constructor(private readonly host: CrmPersistenceHost) {}

  private get prisma(): PrismaService {
    return this.host.prisma;
  }

  async getDefaultPipeline(organizationId: string): Promise<Pipeline> {
    const record = await this.host.ensureDefaultPipeline(organizationId);
    const pipeline = await this.getPipeline(organizationId, record.id);
    if (!pipeline) throw new PipelineNotFoundError('Pipeline');
    return pipeline;
  }

  async ensureDefaultPipeline(organizationId: string): Promise<Pipeline> {
    return this.getDefaultPipeline(organizationId);
  }

  async listPipelines(
    organizationId: string,
    filters?: PipelineListFilters,
  ): Promise<readonly Pipeline[]> {
    await this.host.ensureDefaultPipeline(organizationId);
    const search = filters?.search?.trim();
    const rows = await this.prisma.pipeline.findMany({
      where: {
        organizationId,
        ...(filters?.status ? { status: filters.status } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        stages: pipelineStagesInclude,
        _count: { select: { leads: true } },
      },
    });
    return rows.map((row) => pipelineRowToDomain(row));
  }

  async getPipeline(organizationId: string, pipelineId: string): Promise<Pipeline | null> {
    const row = await this.prisma.pipeline.findFirst({
      where: { id: pipelineId, organizationId },
      include: {
        stages: pipelineStagesInclude,
        _count: { select: { leads: true } },
      },
    });
    return row ? pipelineRowToDomain(row) : null;
  }

  async createPipeline(
    organizationId: string,
    input: CreatePipelineData,
    audit: PipelineAuditEntry,
  ): Promise<Pipeline> {
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
      await syncPipelineStages(tx, organizationId, pipeline.id, input.stages);
      await writeAudit(tx, organizationId, { ...audit, entityId: pipeline.id });
      return tx.pipeline.findFirstOrThrow({
        where: { id: pipeline.id, organizationId },
        include: {
          stages: pipelineStagesInclude,
          _count: { select: { leads: true } },
        },
      });
    });
    return pipelineRowToDomain(row);
  }

  async updatePipeline(
    organizationId: string,
    pipelineId: string,
    input: UpdatePipelineData,
    audit: PipelineAuditEntry,
  ): Promise<Pipeline> {
    const existing = await this.getPipeline(organizationId, pipelineId);
    if (!existing) throw new PipelineNotFoundError('Pipeline');
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
      if (input.stages) {
        await syncPipelineStages(tx, organizationId, pipelineId, input.stages);
      }
      await writeAudit(tx, organizationId, audit);
      return tx.pipeline.findFirstOrThrow({
        where: { id: pipelineId, organizationId },
        include: {
          stages: pipelineStagesInclude,
          _count: { select: { leads: true } },
        },
      });
    });
    return pipelineRowToDomain(row);
  }

  async deletePipeline(
    organizationId: string,
    pipelineId: string,
    audit: PipelineAuditEntry,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const leadCount = await tx.lead.count({ where: { organizationId, pipelineId } });
      if (leadCount > 0) throw new PipelineHasDependentLeadsError(leadCount);
      const existing = await tx.pipeline.findFirst({
        where: { id: pipelineId, organizationId },
        select: { id: true },
      });
      if (!existing) throw new PipelineNotFoundError('Pipeline');
      await tx.pipelineStage.deleteMany({ where: { pipelineId, organizationId } });
      await tx.pipeline.delete({ where: { id: pipelineId, organizationId } });
      await writeAudit(tx, organizationId, audit);
    });
  }

  async createStage(
    organizationId: string,
    pipelineId: string,
    input: CreateStageData,
    audit: PipelineAuditEntry,
  ): Promise<PipelineStage> {
    const pipeline = await this.getPipeline(organizationId, pipelineId);
    if (!pipeline) throw new PipelineNotFoundError('Pipeline');
    await assertUniqueStageName(this.prisma, organizationId, pipelineId, input.name);
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
      await writeAudit(tx, organizationId, audit);
      return stage;
    });
    const leadCount = await this.prisma.lead.count({ where: { organizationId, stageId: row.id } });
    return pipelineStageRowToDomain(row, leadCount);
  }

  async updateStage(
    organizationId: string,
    pipelineId: string,
    stageId: string,
    input: UpdateStageData,
    audit: PipelineAuditEntry,
  ): Promise<PipelineStage> {
    const stage = await this.prisma.pipelineStage.findFirst({
      where: { id: stageId, pipelineId, organizationId },
    });
    if (!stage) throw new PipelineNotFoundError('Pipeline stage');
    if (input.status !== undefined && input.status !== stage.status) {
      PipelineStageValidationService.assertStatusChangeViaLifecycle();
    }
    if (input.name !== undefined && input.name !== stage.name) {
      await assertUniqueStageName(this.prisma, organizationId, pipelineId, input.name, stageId);
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
      await writeAudit(tx, organizationId, audit);
      return updated;
    });
    const leadCount = await this.prisma.lead.count({ where: { organizationId, stageId: row.id } });
    return pipelineStageRowToDomain(row, leadCount);
  }

  async deleteStage(
    organizationId: string,
    pipelineId: string,
    stageId: string,
    targetStageId: string | undefined,
    audit: PipelineAuditEntry,
  ): Promise<void> {
    const stage = await this.prisma.pipelineStage.findFirst({
      where: { id: stageId, pipelineId, organizationId },
    });
    if (!stage) throw new PipelineNotFoundError('Pipeline stage');

    const leadCount = await this.prisma.lead.count({
      where: { organizationId, stageId },
    });
    if (leadCount > 0) {
      if (stage.outcome === 'WON' || stage.outcome === 'LOST') {
        throw new PipelineStageDeleteBlockedError(
          'Terminal stages with active leads cannot be deleted.',
        );
      }
      if (!targetStageId) {
        throw new PipelineValidationError(
          'targetStageId is required to reassign leads before deleting this stage.',
        );
      }
      const target = await this.prisma.pipelineStage.findFirst({
        where: { id: targetStageId, pipelineId, organizationId, status: 'ACTIVE' },
      });
      if (!target) throw new PipelineNotFoundError('Target pipeline stage');
      if (target.id === stageId) {
        throw new PipelineValidationError('targetStageId must differ from the stage being deleted.');
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
      await writeAudit(tx, organizationId, audit);
    });
  }

  async activateStage(
    organizationId: string,
    pipelineId: string,
    stageId: string,
    audit: PipelineAuditEntry,
  ): Promise<PipelineStage> {
    const stage = await this.prisma.pipelineStage.findFirst({
      where: { id: stageId, pipelineId, organizationId },
    });
    if (!stage) throw new PipelineNotFoundError('Pipeline stage');
    if (stage.status === 'ACTIVE') {
      const leadCount = await this.prisma.lead.count({ where: { organizationId, stageId } });
      return pipelineStageRowToDomain(stage, leadCount);
    }

    const row = await this.prisma.$transaction(async (tx) => {
      const sortOrder = await nextActiveStageSortOrder(tx, organizationId, pipelineId);
      const updated = await tx.pipelineStage.update({
        where: { id: stageId },
        data: { status: 'ACTIVE', sortOrder },
      });
      await writeAudit(tx, organizationId, audit);
      return updated;
    });
    const leadCount = await this.prisma.lead.count({ where: { organizationId, stageId: row.id } });
    return pipelineStageRowToDomain(row, leadCount);
  }

  async deactivateStage(
    organizationId: string,
    pipelineId: string,
    stageId: string,
    targetStageId: string | undefined,
    audit: PipelineAuditEntry,
  ): Promise<PipelineStage> {
    const stage = await this.prisma.pipelineStage.findFirst({
      where: { id: stageId, pipelineId, organizationId },
    });
    if (!stage) throw new PipelineNotFoundError('Pipeline stage');
    if (stage.status === 'INACTIVE') {
      const leadCount = await this.prisma.lead.count({ where: { organizationId, stageId } });
      return pipelineStageRowToDomain(stage, leadCount);
    }

    const leadCount = await this.prisma.lead.count({ where: { organizationId, stageId } });
    if (leadCount > 0) {
      if (!targetStageId) {
        throw new PipelineValidationError(
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
        throw new PipelineValidationError(
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
      await writeAudit(tx, organizationId, audit);
      return updated;
    });
    const updatedLeadCount = await this.prisma.lead.count({
      where: { organizationId, stageId: row.id },
    });
    return pipelineStageRowToDomain(row, updatedLeadCount);
  }

  async reorderStages(
    organizationId: string,
    pipelineId: string,
    orderedStageIds: readonly string[],
    audit: PipelineAuditEntry,
  ): Promise<readonly PipelineStage[]> {
    const activeStages = await this.prisma.pipelineStage.findMany({
      where: { organizationId, pipelineId, status: 'ACTIVE' },
      select: { id: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    PipelineStageOrderService.validateActiveReorder(
      activeStages.map((stage) => stage.id),
      orderedStageIds,
    );

    await this.prisma.$transaction(async (tx) => {
      await assignActiveStageOrders(tx, orderedStageIds);
      await writeAudit(tx, organizationId, audit);
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
    return rows.map((row) => pipelineStageRowToDomain(row, countByStage.get(row.id) ?? 0));
  }

  async countLeadsForPipeline(organizationId: string, pipelineId: string): Promise<number> {
    return this.prisma.lead.count({ where: { organizationId, pipelineId } });
  }

  async listActiveStageIds(organizationId: string, pipelineId: string): Promise<readonly string[]> {
    const rows = await this.prisma.pipelineStage.findMany({
      where: { organizationId, pipelineId, status: 'ACTIVE' },
      select: { id: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map((row) => row.id);
  }

  async stageExistsByName(
    organizationId: string,
    pipelineId: string,
    name: string,
    excludeStageId?: string,
  ): Promise<boolean> {
    const existing = await this.prisma.pipelineStage.findFirst({
      where: {
        organizationId,
        pipelineId,
        name: { equals: name, mode: 'insensitive' },
        ...(excludeStageId ? { NOT: { id: excludeStageId } } : {}),
      },
      select: { id: true },
    });
    return Boolean(existing);
  }

  async getStage(
    organizationId: string,
    pipelineId: string,
    stageId: string,
  ): Promise<PipelineStage | null> {
    const row = await this.prisma.pipelineStage.findFirst({
      where: { id: stageId, pipelineId, organizationId },
    });
    if (!row) return null;
    const leadCount = await this.prisma.lead.count({ where: { organizationId, stageId: row.id } });
    return pipelineStageRowToDomain(row, leadCount);
  }

  async findActiveStage(
    organizationId: string,
    pipelineId: string,
    stageId: string,
  ): Promise<PipelineStage | null> {
    const row = await this.prisma.pipelineStage.findFirst({
      where: { id: stageId, pipelineId, organizationId, status: 'ACTIVE' },
    });
    if (!row) return null;
    const leadCount = await this.prisma.lead.count({ where: { organizationId, stageId: row.id } });
    return pipelineStageRowToDomain(row, leadCount);
  }
}

async function syncPipelineStages(
  tx: Pick<PrismaService, 'pipelineStage' | 'lead'>,
  organizationId: string,
  pipelineId: string,
  stages: readonly PipelineStageInput[],
): Promise<void> {
  const existing = await tx.pipelineStage.findMany({
    where: { organizationId, pipelineId },
    select: { id: true },
  });
  const existingIds = new Set(existing.map((row) => row.id));
  const retainedIds = new Set<string>();

  for (let index = 0; index < stages.length; index += 1) {
    const stage = stages[index]!;
    const sortOrder = index + 1;
    if (stage.id && existingIds.has(stage.id)) {
      retainedIds.add(stage.id);
      await tx.pipelineStage.update({
        where: { id: stage.id },
        data: {
          name: stage.name,
          color: stage.color,
          sortOrder,
        },
      });
      continue;
    }
    const id = crypto.randomUUID();
    retainedIds.add(id);
    await tx.pipelineStage.create({
      data: {
        id,
        organizationId,
        pipelineId,
        name: stage.name,
        description: '',
        color: stage.color,
        status: 'ACTIVE',
        outcome: 'NONE',
        sortOrder,
      },
    });
  }

  for (const prior of existing) {
    if (retainedIds.has(prior.id)) continue;
    const leadCount = await tx.lead.count({ where: { organizationId, stageId: prior.id } });
    if (leadCount > 0) {
      throw new PipelineValidationError(
        'A stage with active leads cannot be removed. Reassign those leads first.',
      );
    }
    await tx.pipelineStage.delete({ where: { id: prior.id } });
  }
}

async function assertUniqueStageName(
  prisma: Pick<PrismaService, 'pipelineStage'>,
  organizationId: string,
  pipelineId: string,
  name: string,
  excludeStageId?: string,
): Promise<void> {
  const existing = await prisma.pipelineStage.findFirst({
    where: {
      organizationId,
      pipelineId,
      name: { equals: name, mode: 'insensitive' },
      ...(excludeStageId ? { NOT: { id: excludeStageId } } : {}),
    },
    select: { id: true },
  });
  if (existing) {
    throw new PipelineValidationError('A stage with this name already exists in the pipeline.');
  }
}
