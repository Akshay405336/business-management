import type { Pipeline } from '../entities/pipeline.entity.js';
import type { PipelineStage } from '../entities/pipeline-stage.entity.js';
import type { PipelineListFilters } from '../types/pipeline-filter.types.js';
import type {
  CreatePipelineData,
  CreateStageData,
  PipelineAuditEntry,
  UpdatePipelineData,
  UpdateStageData,
} from '../types/pipeline.types.js';

export const PIPELINE_REPOSITORY = Symbol('PIPELINE_REPOSITORY');

export interface PipelineRepository {
  ensureDefaultPipeline(organizationId: string): Promise<Pipeline>;

  listPipelines(organizationId: string, filters?: PipelineListFilters): Promise<readonly Pipeline[]>;

  getPipeline(organizationId: string, pipelineId: string): Promise<Pipeline | null>;

  getDefaultPipeline(organizationId: string): Promise<Pipeline>;

  createPipeline(
    organizationId: string,
    input: CreatePipelineData,
    audit: PipelineAuditEntry,
  ): Promise<Pipeline>;

  updatePipeline(
    organizationId: string,
    pipelineId: string,
    input: UpdatePipelineData,
    audit: PipelineAuditEntry,
  ): Promise<Pipeline>;

  deletePipeline(organizationId: string, pipelineId: string, audit: PipelineAuditEntry): Promise<void>;

  countLeadsForPipeline(organizationId: string, pipelineId: string): Promise<number>;

  listActiveStageIds(organizationId: string, pipelineId: string): Promise<readonly string[]>;

  stageExistsByName(
    organizationId: string,
    pipelineId: string,
    name: string,
    excludeStageId?: string,
  ): Promise<boolean>;

  getStage(organizationId: string, pipelineId: string, stageId: string): Promise<PipelineStage | null>;

  findActiveStage(
    organizationId: string,
    pipelineId: string,
    stageId: string,
  ): Promise<PipelineStage | null>;

  createStage(
    organizationId: string,
    pipelineId: string,
    input: CreateStageData,
    audit: PipelineAuditEntry,
  ): Promise<PipelineStage>;

  updateStage(
    organizationId: string,
    pipelineId: string,
    stageId: string,
    input: UpdateStageData,
    audit: PipelineAuditEntry,
  ): Promise<PipelineStage>;

  deleteStage(
    organizationId: string,
    pipelineId: string,
    stageId: string,
    targetStageId: string | undefined,
    audit: PipelineAuditEntry,
  ): Promise<void>;

  reorderStages(
    organizationId: string,
    pipelineId: string,
    orderedStageIds: readonly string[],
    audit: PipelineAuditEntry,
  ): Promise<readonly PipelineStage[]>;

  activateStage(
    organizationId: string,
    pipelineId: string,
    stageId: string,
    audit: PipelineAuditEntry,
  ): Promise<PipelineStage>;

  deactivateStage(
    organizationId: string,
    pipelineId: string,
    stageId: string,
    targetStageId: string | undefined,
    audit: PipelineAuditEntry,
  ): Promise<PipelineStage>;
}
