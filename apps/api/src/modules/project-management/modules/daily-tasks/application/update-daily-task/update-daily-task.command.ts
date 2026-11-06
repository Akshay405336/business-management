import type { OrgAccessActor } from '../../../../../org-access/index.js';
import type { UpdateDailyTaskInput } from '../../domain/types/daily-task-inputs.js';
import type { DailyTaskActor } from '../shared/daily-task-actor.js';

export type UpdateDailyTaskCommand = {
  readonly actor: DailyTaskActor;
  readonly accessActor: OrgAccessActor;
  readonly taskId: string;
  readonly input: UpdateDailyTaskInput;
};
