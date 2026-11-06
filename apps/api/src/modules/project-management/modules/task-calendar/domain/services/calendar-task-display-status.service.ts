import type { DailyTaskListItem } from '@techwin/contracts';
import type { ProjectTaskStatus } from '../../../projects/domain/project-task-types.js';
import type { CalendarTaskDisplayStatus } from '../enums/calendar-task-display-status.enum.js';
import type { TaskCalendarProjectTaskRow } from '../../application/integration/org-task-calendar-data.port.js';

function dailyStageKey(task: DailyTaskListItem): string | null {
  return task.workflowStageKey;
}

/** Map daily workflow + completion/overdue to compact legend buckets. */
export function resolveDailyTaskDisplayStatus(
  task: DailyTaskListItem,
  _clientToday: string,
): CalendarTaskDisplayStatus {
  if (task.completedAt) return 'COMPLETED';
  if (task.isOverdue) return 'OVERDUE';
  const key = dailyStageKey(task);
  if (key === 'in_progress') return 'IN_PROGRESS';
  if (key === 'review') return 'REVIEW';
  if (key === 'todo') return 'OPEN';
  return 'OPEN';
}

export function resolveProjectTaskDisplayStatus(
  status: ProjectTaskStatus,
  task: Pick<TaskCalendarProjectTaskRow, 'dueDate' | 'actualCompletedAt'>,
  today: string,
): CalendarTaskDisplayStatus {
  if (status === 'COMPLETED' || task.actualCompletedAt) return 'COMPLETED';
  if (task.dueDate && task.dueDate < today) return 'OVERDUE';
  if (status === 'IN_PROGRESS') return 'IN_PROGRESS';
  if (status === 'IN_REVIEW') return 'REVIEW';
  if ((status as string) === 'ON_HOLD') return 'ON_HOLD';
  if (status === 'TODO') return 'OPEN';
  return 'OPEN';
}
