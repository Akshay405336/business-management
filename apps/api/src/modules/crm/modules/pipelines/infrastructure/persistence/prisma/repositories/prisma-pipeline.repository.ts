import { Inject, Injectable } from '@nestjs/common';
import { CRM_REPOSITORY } from '../../../../../../shared/domain/repositories/crm.repository.js';
import type { CrmPersistenceHost } from '../../../../../../shared/infrastructure/persistence/prisma/repositories/crm-persistence.shared.js';
import type { Pipeline } from '../../../../domain/entities/pipeline.entity.js';
import type { PipelineStage } from '../../../../domain/entities/pipeline-stage.entity.js';
import type { PipelineRepository } from '../../../../domain/repositories/pipeline.repository.js';
import type { PipelineListFilters } from '../../../../domain/types/pipeline-filter.types.js';
import type {
  CreatePipelineData,
  CreateStageData,
  PipelineAuditEntry,
  UpdatePipelineData,
  UpdateStageData,
} from '../../../../domain/types/pipeline.types.js';
import { PipelinePrismaStore } from '../pipeline-prisma.store.js';

@Injectable()
export class PrismaPipelineRepository implements PipelineRepository {
  private readonly store: PipelinePrismaStore;

  constructor(@Inject(CRM_REPOSITORY) host: CrmPersistenceHost) {
    this.store = new PipelinePrismaStore(host);
  }

  ensureDefaultPipeline(organizationId: string): Promise<Pipeline> {
    return this.store.ensureDefaultPipeline(organizationId);
  }

  listPipelines(organizationId: string, filters?: PipelineListFilters): Promise<readonly Pipeline[]> {
    return this.store.listPipelines(organizationId, filters);
  }

  getPipeline(organizationId: string, pipelineId: string): Promise<Pipeline | null> {
    return this.store.getPipeline(organizationId, pipelineId);
  }

  getDefaultPipeline(organizationId: string): Promise<Pipeline> {
    return this.store.getDefaultPipeline(organizationId);
  }

  createPipeline(
    organizationId: string,
    input: CreatePipelineData,
    audit: PipelineAuditEntry,
  ): Promise<Pipeline> {
    return this.store.createPipeline(organizationId, input, audit);
  }

  updatePipeline(
    organizationId: string,
    pipelineId: string,
    input: UpdatePipelineData,
    audit: PipelineAuditEntry,
  ): Promise<Pipeline> {
    return this.store.updatePipeline(organizationId, pipelineId, input, audit);
  }

  deletePipeline(organizationId: string, pipelineId: string, audit: PipelineAuditEntry): Promise<void> {
    return this.store.deletePipeline(organizationId, pipelineId, audit);
  }

  countLeadsForPipeline(organizationId: string, pipelineId: string): Promise<number> {
    return this.store.countLeadsForPipeline(organizationId, pipelineId);
  }

  listActiveStageIds(organizationId: string, pipelineId: string): Promise<readonly string[]> {
    return this.store.listActiveStageIds(organizationId, pipelineId);
  }

  stageExistsByName(
    organizationId: string,
    pipelineId: string,
    name: string,
    excludeStageId?: string,
  ): Promise<boolean> {
    return this.store.stageExistsByName(organizationId, pipelineId, name, excludeStageId);
  }

  getStage(organizationId: string, pipelineId: string, stageId: string): Promise<PipelineStage | null> {
    return this.store.getStage(organizationId, pipelineId, stageId);
  }

  findActiveStage(
    organizationId: string,
    pipelineId: string,
    stageId: string,
  ): Promise<PipelineStage | null> {
    return this.store.findActiveStage(organizationId, pipelineId, stageId);
  }

  createStage(
    organizationId: string,
    pipelineId: string,
    input: CreateStageData,
    audit: PipelineAuditEntry,
  ): Promise<PipelineStage> {
    return this.store.createStage(organizationId, pipelineId, input, audit);
  }

  updateStage(
    organizationId: string,
    pipelineId: string,
    stageId: string,
    input: UpdateStageData,
    audit: PipelineAuditEntry,
  ): Promise<PipelineStage> {
    return this.store.updateStage(organizationId, pipelineId, stageId, input, audit);
  }

  deleteStage(
    organizationId: string,
    pipelineId: string,
    stageId: string,
    targetStageId: string | undefined,
    audit: PipelineAuditEntry,
  ): Promise<void> {
    return this.store.deleteStage(organizationId, pipelineId, stageId, targetStageId, audit);
  }

  reorderStages(
    organizationId: string,
    pipelineId: string,
    orderedStageIds: readonly string[],
    audit: PipelineAuditEntry,
  ): Promise<readonly PipelineStage[]> {
    return this.store.reorderStages(organizationId, pipelineId, orderedStageIds, audit);
  }

  activateStage(
    organizationId: string,
    pipelineId: string,
    stageId: string,
    audit: PipelineAuditEntry,
  ): Promise<PipelineStage> {
    return this.store.activateStage(organizationId, pipelineId, stageId, audit);
  }

  deactivateStage(
    organizationId: string,
    pipelineId: string,
    stageId: string,
    targetStageId: string | undefined,
    audit: PipelineAuditEntry,
  ): Promise<PipelineStage> {
    return this.store.deactivateStage(organizationId, pipelineId, stageId, targetStageId, audit);
  }
}
