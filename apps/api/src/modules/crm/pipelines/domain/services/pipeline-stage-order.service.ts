import { PipelineNotFoundError, PipelineValidationError } from '../errors/pipeline.errors.js';

export class PipelineStageOrderService {
  static validateActiveReorder(
    activeStageIds: readonly string[],
    orderedStageIds: readonly string[],
  ): void {
    const activeIds = new Set(activeStageIds);
    if (orderedStageIds.length !== activeIds.size) {
      throw new PipelineValidationError('Stage reorder must include every active stage exactly once.');
    }
    const seen = new Set<string>();
    for (const id of orderedStageIds) {
      if (!activeIds.has(id)) {
        throw new PipelineNotFoundError('Pipeline stage');
      }
      if (seen.has(id)) {
        throw new PipelineValidationError('Stage reorder contains duplicate stage identifiers.');
      }
      seen.add(id);
    }
  }
}
