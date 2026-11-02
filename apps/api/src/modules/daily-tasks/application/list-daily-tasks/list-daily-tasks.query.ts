import type { DailyTaskListQuery } from '../../domain/types/daily-task-inputs.js';
import type { DailyTaskActor } from '../shared/daily-task-actor.js';

export type ListDailyTasksQuery = {
  readonly actor: DailyTaskActor;
  readonly query: DailyTaskListQuery;
  readonly clientToday: string;
};
