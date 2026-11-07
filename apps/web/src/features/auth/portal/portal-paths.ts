import type { PortalKind } from './portal-policy';

export const PORTAL_PREFIX: Record<PortalKind, string> = {
  admin: '/admin',
  employee: '/employee',
  'project-manager': '/project-manager',
};

export function portalDashboardPath(_portal: PortalKind): string {
  return '/admin/dashboard';
}

/** Navigation uses canonical `href` values from `ADMIN_NAV_GROUPS` (no portal rewriting). */
export function adminFeaturePathToPortal(adminPath: string, _portal: PortalKind): string {
  return adminPath;
}

export function pathBelongsToPortal(pathname: string, portal: PortalKind): boolean {
  const prefix = PORTAL_PREFIX[portal];
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}
