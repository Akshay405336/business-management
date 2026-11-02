import type { DailyTaskWorkflowStagesResponse } from '@techwin/contracts';
import type { DailyTaskWorkflowStage } from '../../../domain/read-models/daily-task.models.js';

export function toDailyTaskWorkflowStagesResponse(
  stages: readonly DailyTaskWorkflowStage[],
): DailyTaskWorkflowStagesResponse {
  return {
    stages: stages.map((stage) => ({
      id: stage.id,
      stageKey: stage.stageKey,
      name: stage.name,
      sortOrder: stage.sortOrder,
      colorToken: stage.colorToken,
      isActive: stage.isActive,
      isCompletedStage: stage.isCompletedStage,
    })),
  };
}
