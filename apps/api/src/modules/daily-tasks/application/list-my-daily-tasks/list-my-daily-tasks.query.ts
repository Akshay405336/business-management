import type { MyDailyTasksQuery } from '../../domain/types/daily-task-inputs.js';
import type { DailyTaskActor } from '../shared/daily-task-actor.js';

export type ListMyDailyTasksQuery = {
  readonly actor: DailyTaskActor;
  readonly query: MyDailyTasksQuery;
  readonly clientToday: string;
};
