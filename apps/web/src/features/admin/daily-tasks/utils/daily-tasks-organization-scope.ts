import type { PermissionKey } from '@techwin/contracts';

/** Matches backend `ORGANIZATION_TASK_MANAGE_KEYS` for org-wide board/list access. */
const ORGANIZATION_DAILY_TASK_KEYS: readonly PermissionKey[] = [
  'tasks.create',
  'tasks.assign',
  'tasks.update',
  'tasks.delete',
];

export function canViewOrganizationDailyTasks(
  has: (key: PermissionKey) => boolean,
  hasAny: (...keys: PermissionKey[]) => boolean,
): boolean {
  return hasAny(...ORGANIZATION_DAILY_TASK_KEYS);
}

export type DailyTasksDataScope = 'team' | 'own';

export type DailyTasksPortal = 'admin' | 'employee';

export function resolveDailyTasksDataScope(input: {
  readonly portal: DailyTasksPortal;
  readonly workspaceParam: string | null;
  readonly explicitScope?: DailyTasksDataScope;
}): DailyTasksDataScope {
  if (input.portal === 'employee') return 'own';
  if (input.explicitScope) return input.explicitScope;
  if (input.workspaceParam === 'my') return 'own';
  if (input.workspaceParam === 'team') return 'team';
  return 'team';
}
