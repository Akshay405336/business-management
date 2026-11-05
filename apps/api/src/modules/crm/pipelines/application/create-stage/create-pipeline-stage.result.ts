import type { PipelineStageReadModel } from '../../domain/types/pipeline-read-model.js';

export type CreatePipelineStageResult = {
  readonly stage: PipelineStageReadModel;
};
