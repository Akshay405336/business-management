import type { PipelineStageReadModel } from '../../domain/types/pipeline-read-model.js';

export type DeactivatePipelineStageResult = {
  readonly stage: PipelineStageReadModel;
};
