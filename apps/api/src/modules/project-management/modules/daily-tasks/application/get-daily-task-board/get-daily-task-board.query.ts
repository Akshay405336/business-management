import type { OrgAccessActor } from '../../../../../org-access/application/shared/org-access-actor.js';
import type { DailyTaskBoardQuery } from '../../domain/types/daily-task-inputs.js';
import type { DailyTaskActor } from '../shared/daily-task-actor.js';

export type GetDailyTaskBoardQuery = {
  readonly actor: DailyTaskActor;
  readonly accessActor: OrgAccessActor;
  readonly query: DailyTaskBoardQuery;
};
