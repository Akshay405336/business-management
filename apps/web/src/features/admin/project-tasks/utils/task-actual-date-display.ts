import type { ProjectTask, ProjectTaskStatus } from '../types';
import { formatProjectDateFromTimestamp, formatProjectDateOnly } from './format-project-date';

export function formatPipelineTaskPlannedRange(task: Pick<ProjectTask, 'startDate' | 'dueDate'>): string {
  const start = task.startDate ? formatProjectDateOnly(task.startDate) : '—';
  const end = task.dueDate ? formatProjectDateOnly(task.dueDate) : '—';
  return `${start} – ${end}`;
}

function isCompletedStatus(status: ProjectTaskStatus): boolean {
  return status === 'COMPLETED';
}

function isActiveBeforeComplete(status: ProjectTaskStatus): boolean {
  return status === 'IN_PROGRESS' || status === 'IN_REVIEW';
}

/** Second date line on pipeline task cards (`Started: …`). */
export function formatPipelineTaskStartedRange(
  task: Pick<ProjectTask, 'status' | 'actualStartedAt' | 'actualCompletedAt'>,
): string {
  if (task.status === 'TODO') return 'Not yet';

  const startLabel = task.actualStartedAt
    ? formatProjectDateFromTimestamp(task.actualStartedAt)
    : '—';

  if (isCompletedStatus(task.status) && task.actualCompletedAt) {
    return `${startLabel} – ${formatProjectDateFromTimestamp(task.actualCompletedAt)}`;
  }

  if (isActiveBeforeComplete(task.status) || isCompletedStatus(task.status)) {
    return `${startLabel} – Not yet`;
  }

  return 'Not yet';
}
