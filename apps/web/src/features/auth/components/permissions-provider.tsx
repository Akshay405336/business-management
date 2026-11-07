'use client';

import {
  API_ERROR_CODES,
  type MyOrganizationRole,
  type MySessionEmployeeSummary,
  type PermissionKey,
} from '@techwin/contracts';
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
import { WorkspaceShellSkeleton } from '@/components/loading/skeletons';
import { getMyPermissions } from '@/features/admin/org-access/api/org-access';
import { describeOrgAccessError } from '@/features/admin/org-access/utils/errors';
import { invalidateMyPermissionsCache } from '@/features/admin/org-access/my-permissions-cache';
import { useAuthenticatedAdmin } from '@/features/admin/auth/hooks/use-admin-session';
import { readPostAuthBootstrap } from '@/features/admin/auth/utils/post-auth-bootstrap';
import { loginPath } from '@/features/admin/auth/utils/auth-errors';
import { onAccessDenied } from '@/shared/api/api-client';
import { isApiError } from '@/shared/api/api-error';
import { useRouter } from 'next/navigation';
import { isAbortError } from '@/shared/lib/abort-error';
import {
  formatMembershipRoleLabel,
  membershipAccessContext,
  type MembershipAccessContext,
} from '../membership/membership-access';
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
  readonly roles: readonly MyOrganizationRole[];
  readonly sessionEmployee: MySessionEmployeeSummary | null;
  readonly membershipRoleLabel: string;
  readonly navAccess: MembershipAccessContext;
  readonly loading: false;
  readonly has: (key: PermissionKey) => boolean;
  readonly hasAny: (...keys: PermissionKey[]) => boolean;
  readonly hasAll: (...keys: PermissionKey[]) => boolean;
  readonly refresh: () => Promise<void>;
  readonly defaultDashboard: string;
};

const PermissionsContext = createContext<PermissionsContextValue | null>(null);

type AccessSnapshot = {
  readonly permissions: readonly PermissionKey[];
  readonly roles: readonly MyOrganizationRole[];
  readonly sessionEmployee: MySessionEmployeeSummary | null;
};

function readBootstrapSnapshot(): AccessSnapshot | null {
  const bootstrap = readPostAuthBootstrap();
  if (!bootstrap) return null;
  return {
    permissions: bootstrap.permissions,
    roles: bootstrap.roles,
    sessionEmployee: bootstrap.sessionEmployee ?? null,
  };
}

function hasUsableAccess(snapshot: AccessSnapshot | null): boolean {
  return snapshot !== null && snapshot.permissions.length > 0 && snapshot.roles.length > 0;
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
  const initialSnapshot = useMemo(() => readBootstrapSnapshot(), []);
  const [snapshot, setSnapshot] = useState<AccessSnapshot | null>(initialSnapshot);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(() => !hasUsableAccess(initialSnapshot));
  const loadGenerationRef = useRef(0);
  const hadBootstrapRef = useRef(hasUsableAccess(initialSnapshot));

  const applySnapshot = useCallback((next: AccessSnapshot) => {
    setSnapshot(next);
    setFatalError(null);
  }, []);

  const runPermissionLoad = useCallback(
    async (options: {
      readonly signal?: AbortSignal;
      readonly generation: number;
      readonly silent?: boolean;
    }) => {
      const { signal, generation, silent = false } = options;
      if (!silent) {
        setInitializing(true);
      }
      setFatalError(null);

      try {
        const response = await getMyPermissions(signal);
        if (generation !== loadGenerationRef.current) return;
        if (signal?.aborted) return;

        const roles = response.roles ?? [];
        if (response.permissions.length > 0 && roles.length === 0) {
          if (generation !== loadGenerationRef.current) return;
          setFatalError(
            'No organization role is assigned to your account. Contact an administrator to assign a role.',
          );
          setInitializing(false);
          return;
        }
        applySnapshot({
          permissions: response.permissions,
          roles,
          sessionEmployee: response.sessionEmployee ?? null,
        });
      } catch (failure) {
        if (signal?.aborted || isAbortError(failure)) return;
        if (generation !== loadGenerationRef.current) return;

        if (
          isApiError(failure) &&
          (failure.code === API_ERROR_CODES.UNAUTHENTICATED ||
            failure.code === API_ERROR_CODES.ACCESS_TOKEN_INVALID ||
            failure.code === API_ERROR_CODES.SESSION_EXPIRED)
        ) {
          router.replace(loginPath('session_expired'));
          return;
        }

        setSnapshot((previous) => {
          if (previous && previous.permissions.length > 0) {
            return previous;
          }
          return { permissions: [], roles: [], sessionEmployee: null };
        });

        setFatalError(describeOrgAccessError(failure));
      } finally {
        if (generation === loadGenerationRef.current) {
          setInitializing(false);
        }
      }
    },
    [applySnapshot, router],
  );

  const lastSilentRefreshAt = useRef(0);

  useEffect(() => {
    return onAccessDenied(() => {
      const now = Date.now();
      if (now - lastSilentRefreshAt.current < ACCESS_DENIED_REFRESH_INTERVAL_MS) return;
      lastSilentRefreshAt.current = now;
      const generation = ++loadGenerationRef.current;
      void runPermissionLoad({ generation, silent: true });
    });
  }, [runPermissionLoad]);

  useEffect(() => {
    const controller = new AbortController();
    const generation = ++loadGenerationRef.current;
    const silent = hadBootstrapRef.current;

    void runPermissionLoad({
      signal: controller.signal,
      generation,
      silent,
    });

    return () => {
      loadGenerationRef.current += 1;
      controller.abort();
    };
  }, [runPermissionLoad]);

  const value = useMemo((): PermissionsContextValue | null => {
    if (!snapshot) return null;
    const { permissions, roles, sessionEmployee } = snapshot;
    const permissionSet = new Set(permissions);
    const has = (key: PermissionKey) => permissionSet.has(key);
    const hasAny = (...keys: PermissionKey[]) => keys.some((key) => permissionSet.has(key));
    const hasAll = (...keys: PermissionKey[]) => keys.every((key) => permissionSet.has(key));
    const portal = resolvePortalKind(admin, permissions, roles);
    const navAccess = membershipAccessContext(admin, roles);
    return {
      portal,
      permissions,
      permissionSet,
      roles,
      sessionEmployee,
      membershipRoleLabel: formatMembershipRoleLabel(admin, roles),
      navAccess,
      loading: false,
      has,
      hasAny,
      hasAll,
      defaultDashboard: defaultDashboardPath(portal, permissions, { admin, roles }),
      refresh: async () => {
        invalidateMyPermissionsCache();
        const generation = ++loadGenerationRef.current;
        await runPermissionLoad({ generation });
      },
    };
  }, [admin, runPermissionLoad, snapshot]);

  if (initializing && !hasUsableAccess(snapshot)) {
    return <WorkspaceShellSkeleton />;
  }

  if (fatalError && !hasUsableAccess(snapshot)) {
    return (
      <PermissionsErrorState
        message={fatalError}
        onRetry={() => {
          const generation = ++loadGenerationRef.current;
          void runPermissionLoad({ generation });
        }}
        onSignIn={() => router.replace(loginPath('session_expired'))}
      />
    );
  }

  if (!value) {
    return <WorkspaceShellSkeleton />;
  }

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
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
