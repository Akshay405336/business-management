'use client';

import type { PermissionKey } from '@techwin/contracts';
import { useAdminAccess } from '@/features/admin/auth/components/admin-access-provider';

export function invalidateMyPermissionsCache(): void {
  // Permissions are owned by AdminAccessProvider; refresh via useAdminAccess().refresh().
}

export function useMyPermissions() {
  const access = useAdminAccess();

  return {
    permissions: access.permissions,
    loading: false,
    error: null as string | null,
    has: access.has,
    hasAll: access.hasAll,
    hasAny: access.hasAny,
    refresh: access.refresh,
  };
}

export type { PermissionKey };
