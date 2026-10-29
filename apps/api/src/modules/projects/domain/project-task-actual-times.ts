import type { ProjectTaskStatus } from './project-task-types.js';

export function isTaskProductionActiveStatus(status: ProjectTaskStatus): boolean {
  return status === 'IN_PROGRESS' || status === 'IN_REVIEW' || status === 'COMPLETED';
}

export type TaskActualTimePatch = {
  readonly actualStartedAt?: Date;
  readonly actualCompletedAt?: Date | null;
};

/** Applies status-transition rules for persisted actual start/completion timestamps. */
export function resolveTaskActualTimesOnStatusChange(input: {
  readonly previousStatus: ProjectTaskStatus;
  readonly nextStatus: ProjectTaskStatus;
  readonly actualStartedAt: Date | null;
  readonly actualCompletedAt: Date | null;
  readonly now: Date;
}): TaskActualTimePatch | null {
  const { previousStatus, nextStatus, actualStartedAt, actualCompletedAt, now } = input;
  if (previousStatus === nextStatus) return null;

  const patch: { actualStartedAt?: Date; actualCompletedAt?: Date | null } = {};

  if (isTaskProductionActiveStatus(nextStatus) && !actualStartedAt) {
    patch.actualStartedAt = now;
  }

  if (nextStatus === 'COMPLETED' && !actualCompletedAt) {
    patch.actualCompletedAt = now;
  }

  if (previousStatus === 'COMPLETED' && nextStatus !== 'COMPLETED' && actualCompletedAt) {
    patch.actualCompletedAt = null;
  }

  if (Object.keys(patch).length === 0) return null;
  return patch;
}

export function resolveTaskActualTimesOnCreate(input: {
  readonly status: ProjectTaskStatus;
  readonly now: Date;
}): TaskActualTimePatch {
  const { status, now } = input;
  if (status === 'TODO') return {};
  if (status === 'COMPLETED') {
    return { actualStartedAt: now, actualCompletedAt: now };
  }
  if (isTaskProductionActiveStatus(status)) {
    return { actualStartedAt: now };
  }
  return {};
}
