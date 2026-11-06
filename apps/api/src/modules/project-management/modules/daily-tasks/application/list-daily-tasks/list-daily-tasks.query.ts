import type { OrgAccessActor } from '../../../../../org-access/application/shared/org-access-actor.js';
import type { DailyTaskListQuery } from '../../domain/types/daily-task-inputs.js';
import type { DailyTaskActor } from '../shared/daily-task-actor.js';

export type ListDailyTasksQuery = {
  readonly actor: DailyTaskActor;
  readonly accessActor: OrgAccessActor;
  readonly query: DailyTaskListQuery;
  readonly clientToday: string;
};
