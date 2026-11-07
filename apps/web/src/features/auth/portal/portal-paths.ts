import type { PortalKind } from './portal-policy';

export const PORTAL_PREFIX: Record<PortalKind, string> = {
  admin: '/admin',
  employee: '/employee',
  'project-manager': '/project-manager',
};

export function portalDashboardPath(portal: PortalKind): string {
  return `${PORTAL_PREFIX[portal]}/dashboard`;
}

const EMPLOYEE_SELF_SERVICE_SUFFIXES: readonly string[] = [
  '/dashboard',
  '/daily-tasks',
  '/attendance',
  '/calendar',
  '/leave',
];

/** Prefer self-service URLs under `/employee` when the active portal is employee-only. */
export function adminFeaturePathToPortal(adminPath: string, portal: PortalKind): string {
  if (portal !== 'employee' || !adminPath.startsWith('/admin')) return adminPath;
  const suffix = adminPath.slice('/admin'.length) || '/dashboard';
  const normalized = suffix.startsWith('/') ? suffix : `/${suffix}`;
  if (
    EMPLOYEE_SELF_SERVICE_SUFFIXES.some(
      (base) => normalized === base || normalized.startsWith(`${base}/`),
    )
  ) {
    return `/employee${normalized}`;
  }
  return adminPath;
}

export function pathBelongsToPortal(pathname: string, portal: PortalKind): boolean {
  const prefix = PORTAL_PREFIX[portal];
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}
