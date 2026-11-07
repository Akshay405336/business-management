import { API_ERROR_CODES, type EmployeeDeletionImpact, type EmployeePendingDailyTask } from '@techwin/contracts';
import { isApiError } from '@/shared/api/api-error';

const DAILY_TASK_STATUS_LABELS: Record<string, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'Review',
  completed: 'Completed',
  unassigned: 'Unassigned',
};

export function labelDailyTaskStatus(status: string): string {
  return DAILY_TASK_STATUS_LABELS[status] ?? status.replaceAll('_', ' ');
}

export function isEmployeePendingTasksError(error: unknown): boolean {
  return isApiError(error) && error.code === API_ERROR_CODES.EMPLOYEE_HAS_PENDING_TASKS;
}

export function pendingTasksFromDeleteError(error: unknown): EmployeeDeletionImpact | null {
  if (!isEmployeePendingTasksError(error) || !isApiError(error)) return null;
  const read = (path: string) => error.details.find((detail) => detail.path === path)?.message;
  const pendingTaskCount = Number(read('pendingTaskCount') ?? 0);
  const completedTaskCount = Number(read('completedTaskCount') ?? 0);
  const tasks = new Map<number, { id?: string; title?: string; status?: string }>();
  for (const detail of error.details) {
    const match = /^tasks\.(\d+)\.(id|title|status)$/.exec(detail.path);
    if (!match) continue;
    const index = Number(match[1]);
    const field = match[2] as keyof EmployeePendingDailyTask;
    const current = tasks.get(index) ?? {};
    current[field] = detail.message;
    tasks.set(index, current);
  }
  const parsed: EmployeePendingDailyTask[] = [];
  for (const task of tasks.values()) {
    if (!task.id || !task.title || !task.status) continue;
    parsed.push({ id: task.id, title: task.title, status: task.status });
  }
  return {
    pendingTaskCount: Number.isFinite(pendingTaskCount) ? pendingTaskCount : parsed.length,
    completedTaskCount: Number.isFinite(completedTaskCount) ? completedTaskCount : 0,
    tasks: parsed,
  };
}
