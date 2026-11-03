'use client';

import type { PermissionKey } from '@techwin/contracts';
import { Loader2 } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { usePermissions } from '@/features/auth/components/permissions-provider';
import {
  filterProjectManagerNav,
  type ProjectManagerNavGroup,
} from '../navigation/project-manager-nav-config';
import { canAccessProjectManagerPath } from '../navigation/project-manager-route-permissions';

export type ProjectManagerAccessContextValue = {
  readonly permissions: readonly PermissionKey[];
  readonly permissionSet: ReadonlySet<PermissionKey>;
  readonly navGroups: readonly ProjectManagerNavGroup[];
  readonly loading: false;
  readonly has: (key: PermissionKey) => boolean;
  readonly hasAny: (...keys: PermissionKey[]) => boolean;
  readonly hasAll: (...keys: PermissionKey[]) => boolean;
  readonly refresh: () => Promise<void>;
};

const ProjectManagerAccessContext = createContext<ProjectManagerAccessContextValue | null>(null);

export function useProjectManagerAccess(): ProjectManagerAccessContextValue {
  const value = useContext(ProjectManagerAccessContext);
  if (!value) {
    throw new Error('useProjectManagerAccess must be used inside <ProjectManagerAccessProvider>.');
  }
  return value;
}

export function ProjectManagerAccessProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const access = usePermissions();

  const value = useMemo((): ProjectManagerAccessContextValue => {
    return {
      permissions: access.permissions,
      permissionSet: access.permissionSet,
      navGroups: filterProjectManagerNav(access.permissions),
      loading: false,
      has: access.has,
      hasAny: access.hasAny,
      hasAll: access.hasAll,
      refresh: access.refresh,
    };
  }, [access]);

  const redirectTarget = useMemo(() => {
    if (canAccessProjectManagerPath(pathname, value.permissionSet)) return null;
    const fallback =
      value.navGroups.flatMap((group) => group.items).find((item) => item.kind === 'link')?.href ??
      access.defaultDashboard;
    return pathname !== fallback ? fallback : null;
  }, [access.defaultDashboard, pathname, value]);

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

  return (
    <ProjectManagerAccessContext.Provider value={value}>{children}</ProjectManagerAccessContext.Provider>
  );
}
