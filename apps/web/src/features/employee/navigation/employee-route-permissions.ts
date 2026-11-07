import type { PermissionKey } from '@techwin/contracts';
import {
  APP_ROUTE_PERMISSIONS,
  canAccessAppPath,
  permissionsForAppPath,
} from '@/shared/navigation/app-route-permissions';

export const EMPLOYEE_ROUTE_PERMISSIONS: Readonly<Record<string, readonly PermissionKey[]>> =
  Object.fromEntries(
    Object.entries(APP_ROUTE_PERMISSIONS).filter(([route]) => route.startsWith('/employee')),
  ) as Record<string, readonly PermissionKey[]>;

export function permissionsForEmployeePath(pathname: string): readonly PermissionKey[] | null {
  if (!pathname.startsWith('/employee')) return null;
  return permissionsForAppPath(pathname);
}

export function canAccessEmployeePath(
  pathname: string,
  permissions: ReadonlySet<PermissionKey>,
): boolean {
  return canAccessAppPath(pathname, permissions);
}
