import type { DailyTaskActor } from '../shared/daily-task-actor.js';

export type GetDailyTaskQuery = {
  readonly actor: DailyTaskActor;
  readonly taskId: string;
};
