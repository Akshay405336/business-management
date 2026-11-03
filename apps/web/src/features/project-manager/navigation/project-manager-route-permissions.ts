import type { PermissionKey } from '@techwin/contracts';
import { permissionsForAdminPath } from '@/features/admin/navigation/admin-route-permissions';

/**
 * Project Manager portal routes reuse the same permission keys as admin feature routes.
 * Paths under `/project-manager` that are absent from this map are denied.
 */
export const PROJECT_MANAGER_ROUTE_PERMISSIONS: Readonly<Record<string, readonly PermissionKey[]>> =
  {
    '/project-manager': [],
    '/project-manager/dashboard': [],
    '/project-manager/profile': [],
    '/project-manager/pipeline': ['leads.read'],
    '/project-manager/leads': ['leads.read'],
    '/project-manager/packages': ['settings.read'],
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
  '/project-manager',
  '/project-manager/dashboard',
  '/project-manager/profile',
]);

function normalizePath(pathname: string): string {
  return pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

export function permissionsForProjectManagerPath(
  pathname: string,
): readonly PermissionKey[] | null {
  const path = normalizePath(pathname);
  const exact = PROJECT_MANAGER_ROUTE_PERMISSIONS[path];
  if (exact) return exact;

  let best: { route: string; permissions: readonly PermissionKey[] } | null = null;
  for (const [route, permissions] of Object.entries(PROJECT_MANAGER_ROUTE_PERMISSIONS)) {
    if (EXACT_ONLY_ROUTES.has(route) || !path.startsWith(`${route}/`)) continue;
    if (!best || route.length > best.route.length) best = { route, permissions };
  }
  return best?.permissions ?? null;
}

/** Falls back to admin route permission mapping for shared feature suffixes. */
export function canAccessProjectManagerPath(
  pathname: string,
  permissions: ReadonlySet<PermissionKey>,
): boolean {
  const path = normalizePath(pathname);
  const required = permissionsForProjectManagerPath(path);
  if (required === null) {
    if (!path.startsWith('/project-manager')) return false;
    const adminEquivalent = `/admin${path.slice('/project-manager'.length)}`;
    const adminRequired = permissionsForAdminPath(adminEquivalent);
    if (adminRequired === null) return false;
    if (adminRequired.length === 0) return true;
    return adminRequired.some((key) => permissions.has(key));
  }
  if (required.length === 0) return true;
  return required.some((key) => permissions.has(key));
}
