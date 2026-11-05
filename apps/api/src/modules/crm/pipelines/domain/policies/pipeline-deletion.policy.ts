import type { Pipeline } from '../entities/pipeline.entity.js';

export class PipelineDeletionPolicy {
  static assertDeletable(pipeline: Pipeline): void {
    pipeline.assertCanDelete();
  }
}
