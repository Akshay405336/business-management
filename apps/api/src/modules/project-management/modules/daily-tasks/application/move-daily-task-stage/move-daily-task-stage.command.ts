import type { OrgAccessActor } from '../../../../../org-access/application/shared/org-access-actor.js';
import type { MoveDailyTaskStageInput } from '../../domain/types/daily-task-inputs.js';
import type { DailyTaskActor } from '../shared/daily-task-actor.js';

export type MoveDailyTaskStageCommand = {
  readonly actor: DailyTaskActor;
  readonly accessActor: OrgAccessActor;
  readonly taskId: string;
  readonly input: MoveDailyTaskStageInput;
};
