import type { PermissionKey } from '@techwin/contracts';

/** Minimum permissions to view a protected admin route (any listed permission grants access). */
export const ADMIN_ROUTE_PERMISSIONS: Readonly<Record<string, readonly PermissionKey[]>> = {
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
};

export function permissionsForAdminPath(pathname: string): readonly PermissionKey[] {
  if (pathname in ADMIN_ROUTE_PERMISSIONS) {
    return ADMIN_ROUTE_PERMISSIONS[pathname] ?? [];
  }
  for (const [route, permissions] of Object.entries(ADMIN_ROUTE_PERMISSIONS)) {
    if (route !== '/admin/dashboard' && pathname.startsWith(`${route}/`)) {
      return permissions;
    }
  }
  return [];
}

export function canAccessAdminPath(
  pathname: string,
  permissions: ReadonlySet<PermissionKey>,
): boolean {
  const required = permissionsForAdminPath(pathname);
  if (required.length === 0) return true;
  return required.some((key) => permissions.has(key));
}
