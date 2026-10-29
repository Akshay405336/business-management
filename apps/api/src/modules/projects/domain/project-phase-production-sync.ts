import type { ProjectTaskStatus } from './project-task-types.js';
import { isTaskProductionActiveStatus } from './project-task-actual-times.js';

export type PhaseTaskProductionRow = {
  readonly status: ProjectTaskStatus;
  readonly actualStartedAt: Date | null;
  readonly actualCompletedAt: Date | null;
};

export type PhaseProductionFromTasks = {
  readonly productionStartedAt: Date | null;
  readonly productionCompletedAt: Date | null;
  readonly allCompleted: boolean;
  readonly anyProductionStarted: boolean;
};

/** Production timestamps derived only from tasks in the stage (never planned/project dates). */
export function computePhaseProductionFromTasks(
  tasks: readonly PhaseTaskProductionRow[],
): PhaseProductionFromTasks {
  if (tasks.length === 0) {
    return {
      productionStartedAt: null,
      productionCompletedAt: null,
      allCompleted: false,
      anyProductionStarted: false,
    };
  }

  const startedTasks = tasks.filter(
    (task) => isTaskProductionActiveStatus(task.status) && task.actualStartedAt,
  );
  const productionStartedAt =
    startedTasks.length > 0
      ? new Date(
          Math.min(...startedTasks.map((task) => task.actualStartedAt!.getTime())),
        )
      : null;

  const allCompleted = tasks.every((task) => task.status === 'COMPLETED');
  let productionCompletedAt: Date | null = null;
  if (allCompleted) {
    const completionTimes = tasks
      .map((task) => task.actualCompletedAt?.getTime())
      .filter((value): value is number => value !== undefined);
    productionCompletedAt =
      completionTimes.length > 0 ? new Date(Math.max(...completionTimes)) : null;
  }

  return {
    productionStartedAt,
    productionCompletedAt,
    allCompleted,
    anyProductionStarted: productionStartedAt !== null,
  };
}

export type PhaseProductionSyncPatch = {
  actualStartedAt: Date | null;
  actualCompletedAt: Date | null;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  logStageCompleted?: Date;
  logStageCompletionWithdrawn?: Date;
};

export function resolvePhaseProductionSync(input: {
  readonly phaseActualStartedAt: Date | null;
  readonly phaseActualCompletedAt: Date | null;
  readonly tasks: readonly PhaseTaskProductionRow[];
}): PhaseProductionSyncPatch {
  const { phaseActualStartedAt, phaseActualCompletedAt, tasks } = input;
  const computed = computePhaseProductionFromTasks(tasks);

  const status: PhaseProductionSyncPatch['status'] =
    tasks.length === 0
      ? 'NOT_STARTED'
      : computed.allCompleted
        ? 'COMPLETED'
        : computed.anyProductionStarted
          ? 'IN_PROGRESS'
          : 'NOT_STARTED';

  const patch: PhaseProductionSyncPatch = {
    actualStartedAt: computed.productionStartedAt,
    actualCompletedAt: computed.productionCompletedAt,
    status,
  };

  if (
    computed.allCompleted &&
    computed.productionCompletedAt &&
    !phaseActualCompletedAt
  ) {
    patch.logStageCompleted = computed.productionCompletedAt;
  }

  if (!computed.allCompleted && phaseActualCompletedAt) {
    patch.logStageCompletionWithdrawn = phaseActualCompletedAt;
  }

  if (
    computed.allCompleted &&
    computed.productionCompletedAt &&
    phaseActualCompletedAt &&
    computed.productionCompletedAt.getTime() !== phaseActualCompletedAt.getTime()
  ) {
    patch.logStageCompleted = computed.productionCompletedAt;
  }

  return patch;
}
