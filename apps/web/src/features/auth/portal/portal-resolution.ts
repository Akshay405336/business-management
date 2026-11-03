import type { MyOrganizationRole, PermissionKey, PlatformAdminProfile } from '@techwin/contracts';
import { filterAdminNav } from '@/features/admin/navigation/filter-admin-nav';
import { canAccessAdminPath } from '@/features/admin/navigation/admin-route-permissions';
import { canAccessEmployeePath } from '@/features/employee/navigation/employee-route-permissions';
import { filterProjectManagerNav } from '@/features/project-manager/navigation/project-manager-nav-config';
import { canAccessProjectManagerPath } from '@/features/project-manager/navigation/project-manager-route-permissions';
import { membershipAccessContext } from '../membership/membership-access';
import { portalDashboardPath } from './portal-paths';
import { resolvePortalKind, type PortalKind } from './portal-policy';

export type { PortalKind };

export { resolvePortalKind };

export function defaultDashboardPath(
  portal: PortalKind,
  permissions: readonly PermissionKey[],
  input: {
    readonly admin: PlatformAdminProfile;
    readonly roles: readonly MyOrganizationRole[];
  },
): string {
  if (portal === 'employee') return portalDashboardPath('employee');
  if (portal === 'project-manager') {
    const nav = filterProjectManagerNav(permissions);
    const first = nav.flatMap((group) => group.items).find((item) => item.kind === 'link');
    return first?.href ?? portalDashboardPath('project-manager');
  }

  const access = membershipAccessContext(input.admin, input.roles);
  const navGroups = filterAdminNav(permissions, access);
  const firstLink = navGroups
    .flatMap((group) => group.items)
    .find((item) => item.kind === 'link');
  return firstLink?.href ?? portalDashboardPath('admin');
}

export function sanitizeReturnPath(
  value: string | null | undefined,
  portal: PortalKind,
  permissions: ReadonlySet<PermissionKey>,
  access: ReturnType<typeof membershipAccessContext>,
): string | null {
  if (!value) return null;
  const path = value.trim();
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) return null;
  if (path.startsWith('/login') || path.includes('/admin/login')) return null;

  if (portal === 'admin') {
    if (!path.startsWith('/admin')) return null;
    return canAccessAdminPath(path, permissions, access) ? path : null;
  }

  if (portal === 'project-manager') {
    if (!path.startsWith('/project-manager')) return null;
    return canAccessProjectManagerPath(path, permissions) ? path : null;
  }

  if (!path.startsWith('/employee')) return null;
  return canAccessEmployeePath(path, permissions) ? path : null;
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
