import type { PipelineStage } from '../entities/pipeline-stage.entity.js';
import { PipelineStageValidationService } from '../services/pipeline-stage-validation.service.js';

export class PipelineStagePolicy {
  static assertCanDelete(stage: PipelineStage, targetStageId: string | undefined): void {
    stage.assertCanDeleteWithLeads(targetStageId);
  }

  static assertCanDeactivate(stage: PipelineStage, targetStageId: string | undefined): void {
    stage.assertCanDeactivateWithLeads(targetStageId);
  }

  static assertValidTargetStage(stage: PipelineStage | null): asserts stage is PipelineStage {
    PipelineStageValidationService.assertTargetStageIsActive(stage);
  }
}
