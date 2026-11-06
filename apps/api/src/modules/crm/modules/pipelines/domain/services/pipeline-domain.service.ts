import type { Pipeline } from '../entities/pipeline.entity.js';
import type { CreatePipelineData, UpdatePipelineData } from '../types/pipeline.types.js';

export class PipelineDomainService {
  static prepareCreate(input: CreatePipelineData): CreatePipelineData {
    return input;
  }

  static prepareUpdate(pipeline: Pipeline, input: UpdatePipelineData): UpdatePipelineData {
    if (input.status !== undefined && input.status !== pipeline.status) {
      pipeline.changeStatus(input.status);
    }
    return input;
  }
}
