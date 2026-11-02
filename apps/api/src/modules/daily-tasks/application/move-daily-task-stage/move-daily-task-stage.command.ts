import type { MoveDailyTaskStageInput } from '../../domain/types/daily-task-inputs.js';
import type { DailyTaskActor } from '../shared/daily-task-actor.js';

export type MoveDailyTaskStageCommand = {
  readonly actor: DailyTaskActor;
  readonly taskId: string;
  readonly input: MoveDailyTaskStageInput;
};
