import {
  EMPLOYEE_PORTAL_PERMISSIONS,
  type PermissionKey,
  type PlatformAdminProfile,
} from '@techwin/contracts';
import { canAccessAdminPath } from '@/features/admin/navigation/admin-route-permissions';
import { canAccessEmployeePath } from '@/features/employee/navigation/employee-route-permissions';

export type PortalKind = 'admin' | 'employee';

const EMPLOYEE_PORTAL_SET = new Set<string>(EMPLOYEE_PORTAL_PERMISSIONS);

export function resolvePortalKind(
  admin: PlatformAdminProfile,
  permissions: readonly PermissionKey[],
): PortalKind {
  if (admin.role === 'SUPER_ADMIN') return 'admin';
  if (permissions.length === 0) return 'admin';
  const usesEmployeePortal = permissions.every((key) => EMPLOYEE_PORTAL_SET.has(key));
  return usesEmployeePortal ? 'employee' : 'admin';
}

export function defaultDashboardPath(portal: PortalKind): string {
  return portal === 'employee' ? '/employee/dashboard' : '/admin/dashboard';
}

/** Validates a same-origin in-app return path for the authenticated portal. */
export function sanitizeReturnPath(
  value: string | null | undefined,
  portal: PortalKind,
  permissions: ReadonlySet<PermissionKey>,
): string | null {
  if (!value) return null;
  const path = value.trim();
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) return null;
  if (path.startsWith('/login') || path.includes('/admin/login')) return null;

  if (portal === 'admin') {
    if (!path.startsWith('/admin')) return null;
    return canAccessAdminPath(path, permissions) ? path : null;
  }

  if (!path.startsWith('/employee')) return null;
  return canAccessEmployeePath(path, permissions) ? path : null;
}

export function resolvePostAuthRedirect(input: {
  readonly admin: PlatformAdminProfile;
  readonly permissions: readonly PermissionKey[];
  readonly returnTo?: string | null;
}): string {
  const portal = resolvePortalKind(input.admin, input.permissions);
  const permissionSet = new Set(input.permissions);
  const safeReturn = sanitizeReturnPath(input.returnTo, portal, permissionSet);
  return safeReturn ?? defaultDashboardPath(portal);
}
