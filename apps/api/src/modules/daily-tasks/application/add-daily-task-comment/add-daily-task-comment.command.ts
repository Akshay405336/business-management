import type { OrgAccessActor } from '../../../org-access/application/shared/org-access-actor.js';
import type { AddDailyTaskCommentInput } from '../../domain/types/daily-task-inputs.js';
import type { DailyTaskActor } from '../shared/daily-task-actor.js';

export type AddDailyTaskCommentCommand = {
  readonly actor: DailyTaskActor;
  readonly accessActor: OrgAccessActor;
  readonly taskId: string;
  readonly input: AddDailyTaskCommentInput;
};
