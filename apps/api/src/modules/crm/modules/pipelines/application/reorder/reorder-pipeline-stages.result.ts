import type { PipelineStageReadModel } from '../../domain/types/pipeline-read-model.js';

export type ReorderPipelineStagesResult = {
  readonly stages: readonly PipelineStageReadModel[];
};
