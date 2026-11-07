'use client';

import { usePermissions } from '../components/permissions-provider';
import { adminFeaturePathToPortal } from './portal-paths';

export function usePortalNavigation() {
  const { portal, defaultDashboard } = usePermissions();
  return {
    portal,
    dashboardHref: defaultDashboard,
    portalDashboardHref: defaultDashboard,
    toPortalPath: (adminFeatureHref: string) => adminFeaturePathToPortal(adminFeatureHref, portal),
    dashboardBreadcrumb: { label: 'Dashboard' as const, href: defaultDashboard },
  };
}
