import type { PermissionKey } from '@techwin/contracts';
import {
  canAccessWorkspaceDashboard,
  type MembershipAccessContext,
} from '@/features/auth/membership/membership-access';

/** Unified route → permission map for all authenticated app paths (`/admin` and `/employee`). */
export const APP_ROUTE_PERMISSIONS: Readonly<Record<string, readonly PermissionKey[]>> = {
  '/admin': [],
  '/admin/dashboard': [],
  '/admin/users': ['users.read'],
  '/admin/roles': ['roles.read'],
  '/admin/employees': ['employees.read'],
  '/admin/attendance': ['attendance.view_all', 'attendance.manage_settings'],
  '/admin/calendar': ['calendar.view', 'calendar.view_all', 'calendar.manage_holidays'],
  '/admin/leave-types': [
    'leave.types.read',
    'leave.types.create',
    'leave.types.update',
    'leave.types.manage',
  ],
  '/admin/leave-balances': [
    'leave.config.read',
    'leave.config.manage',
    'leave.allocations.read',
    'leave.allocations.manage',
    'leave.balances.read',
    'leave.balances.adjust',
  ],
  '/admin/employee-leave-records': [
    'leave.balances.read',
    'leave.config.read',
    'leave.config.manage',
  ],
  '/admin/leave': ['leave.requests.read_all'],
  '/admin/pipeline': ['leads.read'],
  '/admin/leads': ['leads.read'],
  '/admin/packages': ['settings.read'],
  '/admin/quotations': ['leads.read'],
  '/admin/proposals': ['leads.read'],
  '/admin/clients': ['clients.read'],
  '/admin/projects': ['projects.read'],
  '/admin/project-tasks': ['tasks.read', 'projects.read'],
  '/admin/daily-tasks': ['tasks.read'],
  '/admin/my-tasks': ['tasks.read'],
  '/admin/task-calendar': ['tasks.read'],
  '/admin/whatsapp/inbox': ['whatsapp.read'],
  '/admin/whatsapp/channels': ['whatsapp.channels.manage'],
  '/admin/whatsapp/templates': ['whatsapp.templates.manage', 'whatsapp.broadcasts.manage'],
  '/admin/whatsapp/broadcasts': ['whatsapp.broadcasts.manage'],
  '/admin/whatsapp/reports': ['whatsapp.view_all', 'whatsapp.channels.manage'],
  '/employee': [],
  '/employee/dashboard': [
    'attendance.view_own',
    'leave.requests.read_own',
    'leave.balances.read_own',
    'leave.requests.create',
  ],
  '/employee/daily-tasks': ['tasks.read'],
  '/employee/task-calendar': ['tasks.read'],
  '/employee/attendance': ['attendance.view_own'],
  '/employee/calendar': ['calendar.view'],
  '/employee/leave': [
    'leave.requests.create',
    'leave.requests.read_own',
    'leave.requests.cancel',
    'leave.balances.read_own',
  ],
  '/project-manager': [],
  '/project-manager/dashboard': [],
  '/project-manager/profile': [],
  '/project-manager/pipeline': ['leads.read'],
  '/project-manager/leads': ['leads.read'],
  '/project-manager/packages': ['settings.read'],
  '/project-manager/quotations': ['leads.read'],
  '/project-manager/proposals': ['leads.read'],
  '/project-manager/clients': ['clients.read'],
  '/project-manager/employees': ['employees.read'],
  '/project-manager/whatsapp/inbox': ['whatsapp.read'],
  '/project-manager/whatsapp/channels': ['whatsapp.channels.manage'],
  '/project-manager/whatsapp/templates': ['whatsapp.templates.manage', 'whatsapp.broadcasts.manage'],
  '/project-manager/whatsapp/broadcasts': ['whatsapp.broadcasts.manage'],
  '/project-manager/whatsapp/reports': ['whatsapp.view_all', 'whatsapp.channels.manage'],
};

const EXACT_ONLY_ROUTES: ReadonlySet<string> = new Set([
  '/admin',
  '/admin/dashboard',
  '/employee',
  '/employee/dashboard',
  '/project-manager',
  '/project-manager/dashboard',
  '/project-manager/profile',
]);

function normalizePath(pathname: string): string {
  return pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

export function permissionsForAppPath(pathname: string): readonly PermissionKey[] | null {
  const path = normalizePath(pathname);
  const exact = APP_ROUTE_PERMISSIONS[path];
  if (exact) return exact;
  let best: { route: string; permissions: readonly PermissionKey[] } | null = null;
  for (const [route, permissions] of Object.entries(APP_ROUTE_PERMISSIONS)) {
    if (EXACT_ONLY_ROUTES.has(route) || !path.startsWith(`${route}/`)) continue;
    if (!best || route.length > best.route.length) best = { route, permissions };
  }
  return best?.permissions ?? null;
}

export function canAccessAppPath(
  pathname: string,
  permissions: ReadonlySet<PermissionKey>,
  access?: MembershipAccessContext,
): boolean {
  const path = normalizePath(pathname);
  if (access && (path === '/admin' || path === '/admin/dashboard')) {
    if (!canAccessWorkspaceDashboard(access)) return false;
  }
  const required = permissionsForAppPath(path);
  if (required === null) {
    return (
      !path.startsWith('/admin') &&
      !path.startsWith('/employee') &&
      !path.startsWith('/project-manager')
    );
  }
  if (required.length === 0) return true;
  return required.some((key) => permissions.has(key));
}
