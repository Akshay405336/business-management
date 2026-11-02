import type { RescheduleDailyTaskInput } from '../../domain/types/daily-task-inputs.js';
import type { DailyTaskActor } from '../shared/daily-task-actor.js';

export type RescheduleDailyTaskCommand = {
  readonly actor: DailyTaskActor;
  readonly taskId: string;
  readonly input: RescheduleDailyTaskInput;
};
