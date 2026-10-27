'use client';

import type { PermissionKey } from '@techwin/contracts';
import { Loader2 } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { getMyPermissions } from '@/features/admin/org-access/api/org-access';
import { invalidateMyPermissionsCache } from '@/features/admin/org-access/hooks/use-my-permissions';
import { describeOrgAccessError } from '@/features/admin/org-access/utils/errors';
import { filterAdminNav, type AdminNavGroupWithAccess } from '@/features/admin/navigation/filter-admin-nav';
import { canAccessAdminPath } from '@/features/admin/navigation/admin-route-permissions';
import { useRouter, usePathname } from 'next/navigation';
import { loginPath } from '../utils/auth-errors';
import { readPostAuthBootstrap } from '../utils/post-auth-bootstrap';

function createInitialPermissions(): readonly PermissionKey[] | null {
  return readPostAuthBootstrap()?.permissions ?? null;
}

function createInitialAccessLoading(): boolean {
  return readPostAuthBootstrap()?.permissions === undefined;
}

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
  const [permissions, setPermissions] = useState<readonly PermissionKey[] | null>(createInitialPermissions);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(createInitialAccessLoading);
  const skipInitialPermissionsLoad = useRef(createInitialPermissions() !== null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const response = await getMyPermissions(signal);
      setPermissions(response.permissions);
    } catch (failure) {
      setPermissions([]);
      setError(describeOrgAccessError(failure));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (skipInitialPermissionsLoad.current) {
      skipInitialPermissionsLoad.current = false;
      return;
    }
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const value = useMemo((): AdminAccessContextValue | null => {
    if (!permissions) return null;
    const permissionSet = new Set(permissions);
    const has = (key: PermissionKey) => permissionSet.has(key);
    const hasAny = (...keys: PermissionKey[]) => keys.some((key) => permissionSet.has(key));
    const hasAll = (...keys: PermissionKey[]) => keys.every((key) => permissionSet.has(key));
    return {
      permissions,
      permissionSet,
      navGroups: filterAdminNav(permissions),
      loading: false,
      has,
      hasAny,
      hasAll,
      refresh: async () => {
        invalidateMyPermissionsCache();
        await load();
      },
    };
  }, [load, permissions]);

  const redirectTarget = useMemo(() => {
    if (!value) return null;
    if (canAccessAdminPath(pathname, value.permissionSet)) return null;
    const fallback =
      value.navGroups.flatMap((group) => group.items).find((item) => item.kind === 'link')?.href ??
      '/admin/dashboard';
    return pathname !== fallback ? fallback : null;
  }, [pathname, value]);

  useEffect(() => {
    if (redirectTarget) router.replace(redirectTarget);
  }, [redirectTarget, router]);

  if (loading || !value || redirectTarget) {
    return <AccessLoadingState message={redirectTarget ? 'Redirecting…' : undefined} />;
  }

  if (error && permissions?.length === 0) {
    return (
      <AccessErrorState
        message={error}
        onRetry={() => void load()}
        onSignIn={() => router.replace(loginPath('session_expired'))}
      />
    );
  }

  return <AdminAccessContext.Provider value={value}>{children}</AdminAccessContext.Provider>;
}

function AccessLoadingState({ message = 'Loading your access…' }: { message?: string }) {
  return (
    <div className="bg-background flex min-h-dvh items-center justify-center px-4">
      <p className="text-muted-foreground flex items-center gap-2 text-sm" role="status" aria-live="polite">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        {message}
      </p>
    </div>
  );
}

function AccessErrorState({
  message,
  onRetry,
  onSignIn,
}: {
  message: string;
  onRetry: () => void;
  onSignIn: () => void;
}) {
  return (
    <div className="bg-background flex min-h-dvh items-center justify-center px-4">
      <div className="grid w-full max-w-md gap-4">
        <Alert variant="destructive" role="alert">
          <AlertTitle>Unable to load access permissions</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={onRetry}>
            Try again
          </Button>
          <Button type="button" variant="outline" onClick={onSignIn}>
            Sign in again
          </Button>
        </div>
      </div>
    </div>
  );
}
