import type { OrgAccessActor } from '../../../org-access/index.js';
import type { CreateDailyTaskInput } from '../../domain/types/daily-task-inputs.js';
import type { DailyTaskActor } from '../shared/daily-task-actor.js';

export type CreateDailyTaskCommand = {
  readonly actor: DailyTaskActor;
  readonly accessActor: OrgAccessActor;
  readonly input: CreateDailyTaskInput;
};
