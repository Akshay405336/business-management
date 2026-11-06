import type { PipelineReadModel } from '../../domain/types/pipeline-read-model.js';

export type CreatePipelineResult = {
  readonly pipeline: PipelineReadModel;
};
