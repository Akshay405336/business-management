'use client';

import type { PermissionKey } from '@techwin/contracts';
import { Loader2 } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { filterAdminNav, type AdminNavGroupWithAccess } from '@/features/admin/navigation/filter-admin-nav';
import { canAccessAdminPath } from '@/features/admin/navigation/admin-route-permissions';
import { usePermissions } from '@/features/auth/components/permissions-provider';

export type AdminAccessContextValue = {
  readonly permissions: readonly PermissionKey[];
  readonly permissionSet: ReadonlySet<PermissionKey>;
  readonly navGroups: readonly AdminNavGroupWithAccess[];
  readonly loading: false;
  readonly has: (key: PermissionKey) => boolean;
  readonly hasAny: (...keys: PermissionKey[]) => boolean;
  readonly hasAll: (...keys: PermissionKey[]) => boolean;
  readonly refresh: () => Promise<void>;
};

const AdminAccessContext = createContext<AdminAccessContextValue | null>(null);

export function useAdminAccess(): AdminAccessContextValue {
  const value = useContext(AdminAccessContext);
  if (!value) {
    throw new Error('useAdminAccess must be used inside <AdminAccessProvider>.');
  }
  return value;
}

export function AdminAccessProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const access = usePermissions();

  const value = useMemo((): AdminAccessContextValue => {
    return {
      permissions: access.permissions,
      permissionSet: access.permissionSet,
      navGroups: filterAdminNav(access.permissions),
      loading: false,
      has: access.has,
      hasAny: access.hasAny,
      hasAll: access.hasAll,
      refresh: access.refresh,
    };
  }, [access]);

  const redirectTarget = useMemo(() => {
    if (canAccessAdminPath(pathname, value.permissionSet)) return null;
    const fallback =
      value.navGroups.flatMap((group) => group.items).find((item) => item.kind === 'link')?.href ??
      '/admin/dashboard';
    return pathname !== fallback ? fallback : null;
  }, [pathname, value]);

  useEffect(() => {
    if (redirectTarget) router.replace(redirectTarget);
  }, [redirectTarget, router]);

  if (redirectTarget) {
    return (
      <div className="bg-background flex min-h-dvh items-center justify-center px-4">
        <p className="text-muted-foreground flex items-center gap-2 text-sm" role="status" aria-live="polite">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Redirecting…
        </p>
      </div>
    );
  }

  return <AdminAccessContext.Provider value={value}>{children}</AdminAccessContext.Provider>;
}
