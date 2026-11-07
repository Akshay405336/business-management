import type { MyOrganizationRole, PermissionKey, PlatformAdminProfile } from '@techwin/contracts';
import {
  filterAdminNav,
  type AdminNavGroupWithAccess,
} from '@/features/admin/navigation/filter-admin-nav';
import type { AdminNavLink } from '@/features/admin/navigation/admin-nav-config';
import {
  canAccessWorkspaceDashboard,
  membershipAccessContext,
} from '../membership/membership-access';
import { canAccessAppPath } from '@/shared/navigation/app-route-permissions';
import { resolvePortalKind, type PortalKind } from './portal-policy';

export type { PortalKind };

export { resolvePortalKind };

function navLinks(groups: readonly AdminNavGroupWithAccess[]): AdminNavLink[] {
  return groups.flatMap((group) =>
    group.items.filter((item): item is AdminNavLink => item.kind === 'link'),
  );
}

/** Picks the best post-login landing page from permission-filtered navigation (not portal kind). */
export function defaultDashboardPath(
  _portal: PortalKind,
  permissions: readonly PermissionKey[],
  input: {
    readonly admin: PlatformAdminProfile;
    readonly roles: readonly MyOrganizationRole[];
  },
): string {
  const access = membershipAccessContext(input.admin, input.roles);
  const links = navLinks(filterAdminNav(permissions, access));

  if (canAccessWorkspaceDashboard(access)) {
    const adminDashboard = links.find((item) => item.href === '/admin/dashboard');
    if (adminDashboard) return adminDashboard.href;
  }

  const adminModule = links.find(
    (item) => item.href.startsWith('/admin/') && item.href !== '/admin/dashboard',
  );
  if (adminModule) return adminModule.href;

  const employeeModule = links.find(
    (item) => item.href.startsWith('/employee/') && item.href !== '/employee/dashboard',
  );
  if (employeeModule) return employeeModule.href;

  const fallback = links.find((item) => item.href.endsWith('/dashboard'));
  return fallback?.href ?? links[0]?.href ?? '/employee/dashboard';
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
