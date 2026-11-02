import type { DailyTaskListItem } from '../types';

export type TaskStatusBucket = 'completed' | 'in_progress' | 'pending' | 'overdue' | 'cancelled';

export function isTaskCompleted(task: DailyTaskListItem): boolean {
  return Boolean(task.completedAt) || task.workflowStageKey === 'completed';
}

export function taskStatusBucket(task: DailyTaskListItem): TaskStatusBucket {
  if (isTaskCompleted(task)) return 'completed';
  if (task.isOverdue) return 'overdue';
  if (task.workflowStageKey === 'in_progress' || task.workflowStageKey === 'review') {
    return 'in_progress';
  }
  if (task.workflowStageKey === 'cancelled' || task.workflowStageKey === 'canceled') {
    return 'cancelled';
  }
  return 'pending';
}

export function isTaskUnassigned(task: DailyTaskListItem): boolean {
  return task.assignees.length === 0;
}

export type OrgTaskSummary = {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  overdue: number;
  unassigned: number;
  completionPercent: number;
};

export function computeOrgTaskSummary(tasks: readonly DailyTaskListItem[]): OrgTaskSummary {
  let completed = 0;
  let inProgress = 0;
  let pending = 0;
  let overdue = 0;
  let unassigned = 0;
  for (const task of tasks) {
    const bucket = taskStatusBucket(task);
    if (bucket === 'completed') completed += 1;
    else if (bucket === 'in_progress') inProgress += 1;
    else if (bucket === 'overdue') overdue += 1;
    else if (bucket === 'cancelled') pending += 1;
    else pending += 1;
    if (isTaskUnassigned(task)) unassigned += 1;
  }
  const total = tasks.length;
  const completionPercent = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { total, completed, inProgress, pending, overdue, unassigned, completionPercent };
}

export type DayTaskSummary = OrgTaskSummary;

export function computeDayTaskSummary(tasks: readonly DailyTaskListItem[]): DayTaskSummary {
  return computeOrgTaskSummary(tasks);
}

/** Calendar cell + hover counts aligned to workflow stages (todo / review / in_progress / completed). */
export type CalendarDayCounts = {
  total: number;
  todo: number;
  review: number;
  inProgress: number;
  completed: number;
  overdue: number;
};

export function computeCalendarDayCounts(tasks: readonly DailyTaskListItem[]): CalendarDayCounts {
  let todo = 0;
  let review = 0;
  let inProgress = 0;
  let completed = 0;
  let overdue = 0;
  for (const task of tasks) {
    if (isTaskCompleted(task)) {
      completed += 1;
      continue;
    }
    if (task.isOverdue) overdue += 1;
    const key = task.workflowStageKey;
    if (key === 'review') review += 1;
    else if (key === 'in_progress') inProgress += 1;
    else todo += 1;
  }
  return { total: tasks.length, todo, review, inProgress, completed, overdue };
}

export type EmployeeWorkloadRow = {
  employeeId: string;
  displayName: string;
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  inProgress: number;
};

export function computeEmployeeWorkload(
  tasks: readonly DailyTaskListItem[],
  employees: readonly { id: string; displayName: string }[],
): EmployeeWorkloadRow[] {
  const map = new Map<string, EmployeeWorkloadRow>();
  for (const e of employees) {
    map.set(e.id, {
      employeeId: e.id,
      displayName: e.displayName,
      total: 0,
      completed: 0,
      pending: 0,
      overdue: 0,
      inProgress: 0,
    });
  }
  for (const task of tasks) {
    const bucket = taskStatusBucket(task);
    for (const assignee of task.assignees) {
      const row = map.get(assignee.employeeId);
      if (!row) continue;
      row.total += 1;
      if (bucket === 'completed') row.completed += 1;
      else if (bucket === 'in_progress') row.inProgress += 1;
      else if (bucket === 'overdue') row.overdue += 1;
      else row.pending += 1;
    }
  }
  return [...map.values()]
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total || a.displayName.localeCompare(b.displayName));
}

export function filterTasksByStatusBucket(
  tasks: readonly DailyTaskListItem[],
  status: 'ALL' | TaskStatusBucket,
): DailyTaskListItem[] {
  if (status === 'ALL') return [...tasks];
  return tasks.filter((t) => taskStatusBucket(t) === status);
}

export function filterTasksByAssignment(
  tasks: readonly DailyTaskListItem[],
  assignment: 'ALL' | 'ASSIGNED' | 'UNASSIGNED',
): DailyTaskListItem[] {
  if (assignment === 'ALL') return [...tasks];
  if (assignment === 'UNASSIGNED') return tasks.filter(isTaskUnassigned);
  return tasks.filter((t) => !isTaskUnassigned(t));
}
