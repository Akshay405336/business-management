import type { ProjectTask, ProjectTaskStatus } from '../types';

function isTaskProductionActiveStatus(status: ProjectTaskStatus): boolean {
  return status === 'IN_PROGRESS' || status === 'IN_REVIEW' || status === 'COMPLETED';
}

export type PhaseProductionFromTasks = {
  readonly productionStartedAt: string | null;
  readonly productionCompletedAt: string | null;
};

export function computePhaseProductionFromTasks(
  tasks: readonly Pick<ProjectTask, 'status' | 'actualStartedAt' | 'actualCompletedAt'>[],
): PhaseProductionFromTasks {
  if (tasks.length === 0) {
    return { productionStartedAt: null, productionCompletedAt: null };
  }

  const startedTasks = tasks.filter(
    (task) => isTaskProductionActiveStatus(task.status) && task.actualStartedAt,
  );
  let productionStartedAt: string | null = null;
  if (startedTasks.length > 0) {
    const earliest = Math.min(
      ...startedTasks.map((task) => new Date(task.actualStartedAt!).getTime()),
    );
    productionStartedAt = new Date(earliest).toISOString();
  }

  const allCompleted = tasks.every((task) => task.status === 'COMPLETED');
  let productionCompletedAt: string | null = null;
  if (allCompleted) {
    const completionTimes = tasks
      .map((task) => (task.actualCompletedAt ? new Date(task.actualCompletedAt).getTime() : null))
      .filter((value): value is number => value !== null);
    if (completionTimes.length > 0) {
      productionCompletedAt = new Date(Math.max(...completionTimes)).toISOString();
    }
  }

  return { productionStartedAt, productionCompletedAt };
}

/** Header line: `Not yet` | `DD/MM/YYYY – Not yet` | `DD/MM/YYYY – DD/MM/YYYY` */
export function formatPhaseProductionHeaderValue(
  tasks: readonly Pick<ProjectTask, 'status' | 'actualStartedAt' | 'actualCompletedAt'>[],
  formatDate: (iso: string) => string,
): string {
  const { productionStartedAt, productionCompletedAt } = computePhaseProductionFromTasks(tasks);
  if (!productionStartedAt) return 'Not yet';
  const start = formatDate(productionStartedAt);
  if (!productionCompletedAt) return `${start} – Not yet`;
  return `${start} – ${formatDate(productionCompletedAt)}`;
}
