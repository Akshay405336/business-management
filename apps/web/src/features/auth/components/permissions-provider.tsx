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
import { describeOrgAccessError } from '@/features/admin/org-access/utils/errors';
import { invalidateMyPermissionsCache } from '@/features/admin/org-access/my-permissions-cache';
import { useAuthenticatedAdmin } from '@/features/admin/auth/hooks/use-admin-session';
import { readPostAuthBootstrap } from '@/features/admin/auth/utils/post-auth-bootstrap';
import { loginPath } from '@/features/admin/auth/utils/auth-errors';
import { onAccessDenied } from '@/shared/api/api-client';
import { useRouter } from 'next/navigation';
import {
  defaultDashboardPath,
  resolvePortalKind,
  type PortalKind,
} from '../portal/portal-resolution';

const ACCESS_DENIED_REFRESH_INTERVAL_MS = 5_000;

export type PermissionsContextValue = {
  readonly portal: PortalKind;
  readonly permissions: readonly PermissionKey[];
  readonly permissionSet: ReadonlySet<PermissionKey>;
  readonly loading: false;
  readonly has: (key: PermissionKey) => boolean;
  readonly hasAny: (...keys: PermissionKey[]) => boolean;
  readonly hasAll: (...keys: PermissionKey[]) => boolean;
  readonly refresh: () => Promise<void>;
  readonly defaultDashboard: string;
};

const PermissionsContext = createContext<PermissionsContextValue | null>(null);

function createInitialPermissions(): readonly PermissionKey[] | null {
  return readPostAuthBootstrap()?.permissions ?? null;
}

function createInitialLoading(): boolean {
  return readPostAuthBootstrap()?.permissions === undefined;
}

export function usePermissions(): PermissionsContextValue {
  const value = useContext(PermissionsContext);
  if (!value) {
    throw new Error('usePermissions must be used inside <PermissionsProvider>.');
  }
  return value;
}

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { admin } = useAuthenticatedAdmin();
  const [permissions, setPermissions] = useState<readonly PermissionKey[] | null>(
    createInitialPermissions,
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(createInitialLoading);
  const skipInitialLoad = useRef(createInitialPermissions() !== null);

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

  const lastSilentRefreshAt = useRef(0);

  useEffect(() => {
    return onAccessDenied(() => {
      const now = Date.now();
      if (now - lastSilentRefreshAt.current < ACCESS_DENIED_REFRESH_INTERVAL_MS) return;
      lastSilentRefreshAt.current = now;
      getMyPermissions()
        .then((response) => setPermissions(response.permissions))
        .catch(() => undefined);
    });
  }, []);

  useEffect(() => {
    if (skipInitialLoad.current) {
      skipInitialLoad.current = false;
      return;
    }
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const value = useMemo((): PermissionsContextValue | null => {
    if (!permissions) return null;
    const permissionSet = new Set(permissions);
    const has = (key: PermissionKey) => permissionSet.has(key);
    const hasAny = (...keys: PermissionKey[]) => keys.some((key) => permissionSet.has(key));
    const hasAll = (...keys: PermissionKey[]) => keys.every((key) => permissionSet.has(key));
    const portal = resolvePortalKind(admin, permissions);
    return {
      portal,
      permissions,
      permissionSet,
      loading: false,
      has,
      hasAny,
      hasAll,
      defaultDashboard: defaultDashboardPath(portal),
      refresh: async () => {
        invalidateMyPermissionsCache();
        await load();
      },
    };
  }, [admin, load, permissions]);

  if (loading || !value) {
    return <PermissionsLoadingState />;
  }

  if (error && permissions?.length === 0) {
    return (
      <PermissionsErrorState
        message={error}
        onRetry={() => void load()}
        onSignIn={() => router.replace(loginPath('session_expired'))}
      />
    );
  }

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
}

function PermissionsLoadingState() {
  return (
    <div className="bg-background flex min-h-dvh items-center justify-center px-4">
      <p className="text-muted-foreground flex items-center gap-2 text-sm" role="status" aria-live="polite">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Loading your access…
      </p>
    </div>
  );
}

function PermissionsErrorState({
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
