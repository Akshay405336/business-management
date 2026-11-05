import type { Pipeline } from '../../domain/entities/pipeline.entity.js';
import type { PipelineStage } from '../../domain/entities/pipeline-stage.entity.js';
import type { PipelineReadModel, PipelineStageReadModel } from '../../domain/types/pipeline-read-model.js';

export function toPipelineReadModel(pipeline: Pipeline): PipelineReadModel {
  return pipeline.toReadModel();
}

export function toPipelineStageReadModel(stage: PipelineStage): PipelineStageReadModel {
  return stage.toReadModel();
}
