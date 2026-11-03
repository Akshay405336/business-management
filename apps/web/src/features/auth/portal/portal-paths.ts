import type { PortalKind } from './portal-policy';

export const PORTAL_PREFIX: Record<PortalKind, string> = {
  admin: '/admin',
  employee: '/employee',
  'project-manager': '/project-manager',
};

export function portalDashboardPath(portal: PortalKind): string {
  return `${PORTAL_PREFIX[portal]}/dashboard`;
}

/** Maps an `/admin/...` feature path to the same feature under the active portal prefix. */
export function adminFeaturePathToPortal(adminPath: string, portal: PortalKind): string {
  if (portal === 'admin') return adminPath;
  if (!adminPath.startsWith('/admin')) return adminPath;
  const suffix = adminPath.slice('/admin'.length) || '/dashboard';
  return `${PORTAL_PREFIX[portal]}${suffix.startsWith('/') ? suffix : `/${suffix}`}`;
}

export function pathBelongsToPortal(pathname: string, portal: PortalKind): boolean {
  const prefix = PORTAL_PREFIX[portal];
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}
