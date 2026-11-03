'use client';

import type { PermissionKey } from '@techwin/contracts';
import { useAdminAccess } from '@/features/admin/auth/components/admin-access-provider';

export { invalidateMyPermissionsCache } from '../my-permissions-cache';

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
