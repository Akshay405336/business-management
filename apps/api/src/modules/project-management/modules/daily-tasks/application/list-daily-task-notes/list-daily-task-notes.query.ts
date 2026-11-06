import type { OrgAccessActor } from '../../../../../org-access/application/shared/org-access-actor.js';
import type { DailyTaskActor } from '../shared/daily-task-actor.js';

export type ListDailyTaskNotesQuery = {
  readonly actor: DailyTaskActor;
  readonly accessActor: OrgAccessActor;
  readonly taskId: string;
};
