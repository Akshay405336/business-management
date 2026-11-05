import type { PermissionKey } from '@techwin/contracts';

export const EMPLOYEE_ROUTE_PERMISSIONS: Readonly<Record<string, readonly PermissionKey[]>> = {
  '/employee': [],
  '/employee/dashboard': [],
  '/employee/daily-tasks': ['tasks.read'],
  '/employee/attendance': ['attendance.view_own'],
  '/employee/calendar': ['calendar.view'],
  '/employee/leave': [
    'leave.requests.create',
    'leave.requests.read_own',
    'leave.requests.cancel',
    'leave.balances.read_own',
  ],
};

function normalizePath(pathname: string): string {
  return pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

export function permissionsForEmployeePath(pathname: string): readonly PermissionKey[] | null {
  const path = normalizePath(pathname);
  const exact = EMPLOYEE_ROUTE_PERMISSIONS[path];
  if (exact) return exact;
  let best: { route: string; permissions: readonly PermissionKey[] } | null = null;
  for (const [route, permissions] of Object.entries(EMPLOYEE_ROUTE_PERMISSIONS)) {
    if (route === '/employee' || route === '/employee/dashboard') continue;
    if (!path.startsWith(`${route}/`)) continue;
    if (!best || route.length > best.route.length) best = { route, permissions };
  }
  return best?.permissions ?? null;
}

export function canAccessEmployeePath(
  pathname: string,
  permissions: ReadonlySet<PermissionKey>,
): boolean {
  const path = normalizePath(pathname);
  const required = permissionsForEmployeePath(path);
  if (required === null) return !path.startsWith('/employee');
  if (required.length === 0) return true;
  return required.some((key) => permissions.has(key));
}
