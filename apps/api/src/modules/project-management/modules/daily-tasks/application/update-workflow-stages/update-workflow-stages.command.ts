import type { DailyTaskWorkflowStageInput } from '../../domain/types/daily-task-inputs.js';
import type { DailyTaskActor } from '../shared/daily-task-actor.js';

export type UpdateWorkflowStagesCommand = {
  readonly actor: DailyTaskActor;
  readonly stages: readonly DailyTaskWorkflowStageInput[];
};
