import type { OrgAccessActor } from '../../../../../org-access/application/shared/org-access-actor.js';
import type { RescheduleDailyTaskInput } from '../../domain/types/daily-task-inputs.js';
import type { DailyTaskActor } from '../shared/daily-task-actor.js';

export type RescheduleDailyTaskCommand = {
  readonly actor: DailyTaskActor;
  readonly accessActor: OrgAccessActor;
  readonly taskId: string;
  readonly input: RescheduleDailyTaskInput;
};
