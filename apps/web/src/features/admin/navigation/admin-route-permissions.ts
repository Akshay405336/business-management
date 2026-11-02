import type { PermissionKey } from '@techwin/contracts';

/**
 * Single source of truth for admin page access (any listed permission grants access).
 * Sidebar links derive their visibility from this map; admin paths missing from it are denied.
 */
export const ADMIN_ROUTE_PERMISSIONS: Readonly<Record<string, readonly PermissionKey[]>> = {
  '/admin': [],
  '/admin/dashboard': [],
  '/admin/users': ['users.read'],
  '/admin/roles': ['roles.read'],
  '/admin/employees': ['employees.read'],
  '/admin/pipeline': ['leads.read'],
  '/admin/leads': ['leads.read'],
  '/admin/packages': ['settings.read'],
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
};

const EXACT_ONLY_ROUTES: ReadonlySet<string> = new Set(['/admin', '/admin/dashboard']);

function normalizePath(pathname: string): string {
  return pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

/** Required permissions for an admin path, or `null` when the path is not a known admin route. */
export function permissionsForAdminPath(pathname: string): readonly PermissionKey[] | null {
  const path = normalizePath(pathname);
  const exact = ADMIN_ROUTE_PERMISSIONS[path];
  if (exact) return exact;
  let best: { route: string; permissions: readonly PermissionKey[] } | null = null;
  for (const [route, permissions] of Object.entries(ADMIN_ROUTE_PERMISSIONS)) {
    if (EXACT_ONLY_ROUTES.has(route) || !path.startsWith(`${route}/`)) continue;
    if (!best || route.length > best.route.length) best = { route, permissions };
  }
  return best?.permissions ?? null;
}

export function canAccessAdminPath(
  pathname: string,
  permissions: ReadonlySet<PermissionKey>,
): boolean {
  const path = normalizePath(pathname);
  const required = permissionsForAdminPath(path);
  if (required === null) return !path.startsWith('/admin');
  if (required.length === 0) return true;
  return required.some((key) => permissions.has(key));
}
