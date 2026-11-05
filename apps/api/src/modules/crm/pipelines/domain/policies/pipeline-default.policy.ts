import { PipelineValidationError } from '../errors/pipeline.errors.js';
import type { Pipeline } from '../entities/pipeline.entity.js';

export class PipelineDefaultPolicy {
  static assertNotDefault(pipeline: Pipeline): void {
    if (pipeline.isDefault) {
      throw new PipelineValidationError('The default pipeline cannot be deleted.');
    }
  }
}
