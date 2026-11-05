import type { PipelineReadModel } from '../../domain/types/pipeline-read-model.js';

export type ListPipelinesResult = {
  readonly pipelines: readonly PipelineReadModel[];
};
