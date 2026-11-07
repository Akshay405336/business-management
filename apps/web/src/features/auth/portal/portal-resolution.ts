import type { MyOrganizationRole, PermissionKey, PlatformAdminProfile } from '@techwin/contracts';
import { filterAdminNav } from '@/features/admin/navigation/filter-admin-nav';
import { membershipAccessContext } from '../membership/membership-access';
import { canAccessAppPath } from '@/shared/navigation/app-route-permissions';
import { resolvePortalKind, type PortalKind } from './portal-policy';

export type { PortalKind };

export { resolvePortalKind };

export function defaultDashboardPath(
  _portal: PortalKind,
  permissions: readonly PermissionKey[],
  input: {
    readonly admin: PlatformAdminProfile;
    readonly roles: readonly MyOrganizationRole[];
  },
): string {
  const access = membershipAccessContext(input.admin, input.roles);
  const navGroups = filterAdminNav(permissions, access);
  const firstLink = navGroups
    .flatMap((group) => group.items)
    .find((item) => item.kind === 'link');
  return firstLink?.href ?? '/admin/dashboard';
}

export function sanitizeReturnPath(
  value: string | null | undefined,
  _portal: PortalKind,
  permissions: ReadonlySet<PermissionKey>,
  access: ReturnType<typeof membershipAccessContext>,
): string | null {
  if (!value) return null;
  const path = value.trim();
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) return null;
  if (path.startsWith('/login') || path.includes('/admin/login')) return null;

  const isAppPath =
    path.startsWith('/admin') ||
    path.startsWith('/employee') ||
    path.startsWith('/project-manager');
  if (!isAppPath) return null;
  return canAccessAppPath(path, permissions, access) ? path : null;
}

export function resolvePostAuthRedirect(input: {
  readonly admin: PlatformAdminProfile;
  readonly permissions: readonly PermissionKey[];
  readonly roles: readonly MyOrganizationRole[];
  readonly returnTo?: string | null;
}): string {
  const portal = resolvePortalKind(input.admin, input.permissions, input.roles);
  const permissionSet = new Set(input.permissions);
  const access = membershipAccessContext(input.admin, input.roles);
  const safeReturn = sanitizeReturnPath(input.returnTo, portal, permissionSet, access);
  return safeReturn ?? defaultDashboardPath(portal, input.permissions, input);
}
