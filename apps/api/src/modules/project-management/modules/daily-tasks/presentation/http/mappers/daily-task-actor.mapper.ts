import type { DailyTaskActor } from '../../../application/shared/daily-task-actor.js';

export function toDailyTaskActor(context: {
  readonly organizationId: string;
  readonly adminId: string;
}): DailyTaskActor {
  return {
    organizationId: context.organizationId,
    adminId: context.adminId,
  };
}
