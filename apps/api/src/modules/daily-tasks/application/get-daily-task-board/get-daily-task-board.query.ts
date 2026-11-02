import type { DailyTaskBoardQuery } from '../../domain/types/daily-task-inputs.js';
import type { DailyTaskActor } from '../shared/daily-task-actor.js';

export type GetDailyTaskBoardQuery = {
  readonly actor: DailyTaskActor;
  readonly query: DailyTaskBoardQuery;
};
