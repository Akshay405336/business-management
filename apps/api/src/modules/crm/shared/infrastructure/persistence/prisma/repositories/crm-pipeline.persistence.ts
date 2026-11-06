import type {
  CreatePipelineInput,
  CreateStageInput,
  CrmAuditInput,
  PipelineListFilters,
  PipelineRecord,
  PipelineStageRecord,
  UpdatePipelineInput,
  UpdateStageInput,
} from '../../../../domain/repositories/crm.repository.js';
import { PipelinePrismaStore } from '../../../../../modules/pipelines/infrastructure/persistence/prisma/pipeline-prisma.store.js';
import type { PipelineReadModel } from '../../../../../modules/pipelines/domain/types/pipeline-read-model.js';
import type { CrmPersistenceHost } from './crm-persistence.shared.js';

function toPipelineRecord(model: PipelineReadModel): PipelineRecord {
  return {
    id: model.id,
    organizationId: model.organizationId,
    name: model.name,
    description: model.description,
    status: model.status,
    isDefault: model.isDefault,
    sortOrder: model.sortOrder,
    leadCount: model.leadCount,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
    stages: model.stages.map(toStageRecord),
  };
}

function toStageRecord(stage: PipelineReadModel['stages'][number]): PipelineStageRecord {
  return {
    id: stage.id,
    organizationId: stage.organizationId,
    pipelineId: stage.pipelineId,
    name: stage.name,
    description: stage.description,
    color: stage.color,
    status: stage.status,
    sortOrder: stage.sortOrder,
    outcome: stage.outcome,
    leadCount: stage.leadCount,
    createdAt: stage.createdAt,
    updatedAt: stage.updatedAt,
  };
}

/** CRM host adapter — delegates to the Pipeline feature store and maps to legacy CRM records. */
export class CrmPipelinePersistence {
  private readonly store: PipelinePrismaStore;

  constructor(host: CrmPersistenceHost) {
    this.store = new PipelinePrismaStore(host);
  }

  listPipelines(
    organizationId: string,
    filters?: PipelineListFilters,
  ): Promise<readonly PipelineRecord[]> {
    return this.store.listPipelines(organizationId, filters).then((rows) => rows.map((p) => toPipelineRecord(p.toReadModel())));
  }

  getPipeline(organizationId: string, pipelineId: string): Promise<PipelineRecord | null> {
    return this.store
      .getPipeline(organizationId, pipelineId)
      .then((pipeline) => (pipeline ? toPipelineRecord(pipeline.toReadModel()) : null));
  }

  createPipeline(
    organizationId: string,
    input: CreatePipelineInput,
    audit: CrmAuditInput,
  ): Promise<PipelineRecord> {
    return this.store
      .createPipeline(organizationId, input, audit)
      .then((pipeline) => toPipelineRecord(pipeline.toReadModel()));
  }

  updatePipeline(
    organizationId: string,
    pipelineId: string,
    input: UpdatePipelineInput,
    audit: CrmAuditInput,
  ): Promise<PipelineRecord> {
    return this.store
      .updatePipeline(organizationId, pipelineId, input, audit)
      .then((pipeline) => toPipelineRecord(pipeline.toReadModel()));
  }

  deletePipeline(organizationId: string, pipelineId: string, audit: CrmAuditInput): Promise<void> {
    return this.store.deletePipeline(organizationId, pipelineId, audit);
  }

  createStage(
    organizationId: string,
    pipelineId: string,
    input: CreateStageInput,
    audit: CrmAuditInput,
  ): Promise<PipelineStageRecord> {
    return this.store
      .createStage(organizationId, pipelineId, input, audit)
      .then((stage) => toStageRecord(stage.toReadModel()));
  }

  updateStage(
    organizationId: string,
    pipelineId: string,
    stageId: string,
    input: UpdateStageInput,
    audit: CrmAuditInput,
  ): Promise<PipelineStageRecord> {
    return this.store
      .updateStage(organizationId, pipelineId, stageId, input, audit)
      .then((stage) => toStageRecord(stage.toReadModel()));
  }

  deleteStage(
    organizationId: string,
    pipelineId: string,
    stageId: string,
    targetStageId: string | undefined,
    audit: CrmAuditInput,
  ): Promise<void> {
    return this.store.deleteStage(organizationId, pipelineId, stageId, targetStageId, audit);
  }

  reorderStages(
    organizationId: string,
    pipelineId: string,
    orderedStageIds: readonly string[],
    audit: CrmAuditInput,
  ): Promise<readonly PipelineStageRecord[]> {
    return this.store
      .reorderStages(organizationId, pipelineId, orderedStageIds, audit)
      .then((stages) => stages.map((stage) => toStageRecord(stage.toReadModel())));
  }

  activateStage(
    organizationId: string,
    pipelineId: string,
    stageId: string,
    audit: CrmAuditInput,
  ): Promise<PipelineStageRecord> {
    return this.store
      .activateStage(organizationId, pipelineId, stageId, audit)
      .then((stage) => toStageRecord(stage.toReadModel()));
  }

  deactivateStage(
    organizationId: string,
    pipelineId: string,
    stageId: string,
    targetStageId: string | undefined,
    audit: CrmAuditInput,
  ): Promise<PipelineStageRecord> {
    return this.store
      .deactivateStage(organizationId, pipelineId, stageId, targetStageId, audit)
      .then((stage) => toStageRecord(stage.toReadModel()));
  }
}
