import type { PipelineStageReadModel } from '../../domain/types/pipeline-read-model.js';

export type ActivatePipelineStageResult = {
  readonly stage: PipelineStageReadModel;
};
