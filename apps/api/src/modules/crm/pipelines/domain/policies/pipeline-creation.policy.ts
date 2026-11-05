import { Pipeline } from '../entities/pipeline.entity.js';
import type { CreatePipelineData } from '../types/pipeline.types.js';

export class PipelineCreationPolicy {
  static validate(input: CreatePipelineData): CreatePipelineData {
    return Pipeline.validateCreate(input);
  }
}
