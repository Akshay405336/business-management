import { PipelineValidationError } from '../errors/pipeline.errors.js';
import type { PipelineStage } from '../entities/pipeline-stage.entity.js';

export class PipelineStageValidationService {
  static assertStatusChangeViaLifecycle(): void {
    throw new PipelineValidationError('Use activate or deactivate to change stage status.');
  }

  static assertDistinctTargetStage(stageId: string, targetStageId: string): void {
    if (stageId === targetStageId) {
      throw new PipelineValidationError('targetStageId must differ from the stage being deleted.');
    }
  }

  static assertTargetStageIsActive(target: PipelineStage | null): asserts target is PipelineStage {
    if (!target || !target.isActive()) {
      throw new PipelineValidationError(
        'Choose another active stage to move leads before deactivating this stage.',
      );
    }
  }
}
