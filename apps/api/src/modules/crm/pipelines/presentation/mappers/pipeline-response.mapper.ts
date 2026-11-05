import type { CrmPipeline, CrmPipelineStage } from '@techwin/contracts';
import type { PipelineReadModel, PipelineStageReadModel } from '../../domain/types/pipeline-read-model.js';

const iso = (value: Date): string => value.toISOString();

export function toCrmPipelineStageFromReadModel(stage: PipelineStageReadModel): CrmPipelineStage {
  return {
    id: stage.id,
    pipelineId: stage.pipelineId,
    name: stage.name,
    description: stage.description,
    color: stage.color,
    status: stage.status,
    sortOrder: stage.sortOrder,
    outcome: stage.outcome,
    leadCount: stage.leadCount,
    createdAt: iso(stage.createdAt),
    updatedAt: iso(stage.updatedAt),
  };
}

export function toCrmPipelineFromReadModel(pipeline: PipelineReadModel): CrmPipeline {
  return {
    id: pipeline.id,
    name: pipeline.name,
    description: pipeline.description,
    status: pipeline.status,
    isDefault: pipeline.isDefault,
    sortOrder: pipeline.sortOrder,
    leadCount: pipeline.leadCount,
    createdAt: iso(pipeline.createdAt),
    updatedAt: iso(pipeline.updatedAt),
    stages: pipeline.stages.map(toCrmPipelineStageFromReadModel),
  };
}
