import type { PermissionKey } from './permissions.js';

/** Keys that authorize updating workflow stage on assigned daily tasks (includes legacy alias). */
export const DAILY_TASK_UPDATE_STATUS_PERMISSIONS: readonly PermissionKey[] = [
  'daily_tasks.update_status',
  'tasks.progress',
];

/** Keys that authorize adding notes on assigned daily tasks (includes legacy alias). */
export const DAILY_TASK_COMMENT_PERMISSIONS: readonly PermissionKey[] = [
  'daily_tasks.comment',
  'tasks.comment',
];

export function hasDailyTaskUpdateStatusPermission(
  permissions: ReadonlySet<PermissionKey>,
): boolean {
  return DAILY_TASK_UPDATE_STATUS_PERMISSIONS.some((key) => permissions.has(key));
}

export function hasDailyTaskCommentPermission(permissions: ReadonlySet<PermissionKey>): boolean {
  return DAILY_TASK_COMMENT_PERMISSIONS.some((key) => permissions.has(key));
}
