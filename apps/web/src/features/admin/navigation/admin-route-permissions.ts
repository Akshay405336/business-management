import type { PermissionKey } from '@techwin/contracts';
import type { MembershipAccessContext } from '@/features/auth/membership/membership-access';
import {
  APP_ROUTE_PERMISSIONS,
  canAccessAppPath,
  permissionsForAppPath,
} from '@/shared/navigation/app-route-permissions';

/** @deprecated Use APP_ROUTE_PERMISSIONS — admin-only entries remain for compatibility. */
export const ADMIN_ROUTE_PERMISSIONS: Readonly<Record<string, readonly PermissionKey[]>> =
  Object.fromEntries(
    Object.entries(APP_ROUTE_PERMISSIONS).filter(([route]) => route.startsWith('/admin')),
  ) as Record<string, readonly PermissionKey[]>;

export function permissionsForAdminPath(pathname: string): readonly PermissionKey[] | null {
  if (!pathname.startsWith('/admin')) return null;
  return permissionsForAppPath(pathname);
}

export function canAccessAdminPath(
  pathname: string,
  permissions: ReadonlySet<PermissionKey>,
  access?: MembershipAccessContext,
): boolean {
  return canAccessAppPath(pathname, permissions, access);
}
