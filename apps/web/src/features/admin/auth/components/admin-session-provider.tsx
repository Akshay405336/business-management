'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  accessTokenStore,
  hasCsrfCookie,
  onSessionEnded,
  registerSessionRefresher,
} from '@/shared/api/api-client';
import { API_ERROR_CODES } from '@techwin/contracts';
import { ApiError, isApiError } from '@/shared/api/api-error';
import {
  isDefinitiveSessionEnd,
  shouldSuppressSessionEnded,
} from '@/shared/api/session-ended';
import { invalidateMyPermissionsCache } from '@/features/admin/org-access/hooks/use-my-permissions';
import { getCurrentSession } from '../api/get-current-session';
import { logout, logoutAllDevices } from '../api/logout';
import { refreshSession } from '../api/refresh-session';
import type { AdminSessionState } from '../types/auth.types';
import { describeAuthError, loginPath } from '../utils/auth-errors';
import { AdminSessionContext, type AdminSessionContextValue } from '../hooks/use-admin-session';
import {
  clearPostAuthBootstrap,
  hydrateAccessTokenFromBootstrap,
  readPostAuthBootstrap,
} from '../utils/post-auth-bootstrap';

function createInitialSessionState(): AdminSessionState {
  hydrateAccessTokenFromBootstrap();
  const bootstrap = readPostAuthBootstrap();
  if (bootstrap) {
    return {
      status: 'authenticated',
      admin: bootstrap.admin,
      session: bootstrap.session,
    };
  }
  return { status: 'loading' };
}

export function AdminSessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AdminSessionState>(createInitialSessionState);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const leaveIntentionally = useRef(false);

  useEffect(() => {
    registerSessionRefresher(refreshSession);
  }, []);

  useEffect(
    () =>
      onSessionEnded(() => {
        if (leaveIntentionally.current || shouldSuppressSessionEnded()) return;
        setState({ status: 'unauthenticated' });
        router.replace(loginPath('session_expired'));
      }),
    [router],
  );

  useEffect(() => {
    const controller = new AbortController();

    void (async () => {
      hydrateAccessTokenFromBootstrap();
      const hadBootstrap = readPostAuthBootstrap() !== null;
      try {
        if (!hasCsrfCookie() && !accessTokenStore.get()) {
          setState({ status: 'unauthenticated' });
          router.replace(loginPath());
          return;
        }
        const current = await getCurrentSession(controller.signal);
        if (controller.signal.aborted) return;
        clearPostAuthBootstrap();
        setState({
          status: 'authenticated',
          admin: current.admin,
          session: current.session,
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        if (isApiError(error) && error.isTransient) {
          if (hadBootstrap) return;
          setState({ status: 'error', error });
          return;
        }
        if (hadBootstrap && !isDefinitiveSessionEnd(error)) {
          return;
        }
        if (!isDefinitiveSessionEnd(error)) {
          if (
            isApiError(error) &&
            (error.code === API_ERROR_CODES.UNAUTHENTICATED ||
              error.code === API_ERROR_CODES.ACCESS_TOKEN_INVALID) &&
            !accessTokenStore.get() &&
            !hadBootstrap
          ) {
            setState({ status: 'unauthenticated' });
            router.replace(loginPath());
            return;
          }
          setState({
            status: 'error',
            error: isApiError(error)
              ? error
              : new ApiError('network', 'Unable to restore your session.'),
          });
          return;
        }
        clearPostAuthBootstrap();
        setState({ status: 'unauthenticated' });
        router.replace(loginPath('session_expired'));
      }
    })();

    return () => controller.abort();
  }, [reloadKey, router]);

  const reload = useCallback(() => {
    setSignOutError(null);
    setState({ status: 'loading' });
    setReloadKey((value) => value + 1);
  }, []);

  const leave = useCallback(
    async (reason: 'signed_out' | 'session_expired', action: () => Promise<unknown>) => {
      setIsSigningOut(true);
      setSignOutError(null);
      leaveIntentionally.current = true;
      try {
        await action();
        invalidateMyPermissionsCache();
        clearPostAuthBootstrap();
        setState({ status: 'unauthenticated' });
        router.replace(loginPath(reason));
      } catch (error) {
        if (isApiError(error) && !error.isTransient) {
          setState({ status: 'unauthenticated' });
          router.replace(loginPath(reason));
          return;
        }
        leaveIntentionally.current = false;
        setSignOutError(describeAuthError(error));
        setIsSigningOut(false);
      }
    },
    [router],
  );

  const signOut = useCallback(() => leave('signed_out', logout), [leave]);
  const signOutEverywhere = useCallback(() => leave('signed_out', logoutAllDevices), [leave]);

  const value = useMemo<AdminSessionContextValue>(
    () => ({ state, reload, signOut, signOutEverywhere, isSigningOut }),
    [isSigningOut, reload, signOut, signOutEverywhere, state],
  );

  return (
    <AdminSessionContext.Provider value={value}>
      {state.status === 'loading' ? <SessionLoadingState /> : null}
      {state.status === 'error' ? (
        <SessionErrorState message={describeAuthError(state.error)} onRetry={reload} />
      ) : null}
      {state.status === 'authenticated' ? (
        <>
          {signOutError ? (
            <div className="px-4 pt-4 sm:px-6">
              <Alert variant="destructive" role="alert">
                <AlertCircle aria-hidden="true" />
                <AlertTitle>Sign-out did not complete</AlertTitle>
                <AlertDescription>{signOutError}</AlertDescription>
              </Alert>
            </div>
          ) : null}
          {children}
        </>
      ) : null}
    </AdminSessionContext.Provider>
  );
}

function SessionLoadingState() {
  return (
    <div className="bg-background flex min-h-dvh items-center justify-center px-4">
      <p
        className="text-muted-foreground flex items-center gap-2 text-sm"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Restoring your session...
      </p>
    </div>
  );
}

function SessionErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="bg-background flex min-h-dvh items-center justify-center px-4">
      <div className="grid w-full max-w-md gap-4">
        <Alert variant="destructive" role="alert">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>Unable to restore your session</AlertTitle>
          <AlertDescription>
            {message} This is a temporary problem; you have not been signed out.
          </AlertDescription>
        </Alert>
        <Button type="button" onClick={onRetry}>
          Try again
        </Button>
      </div>
    </div>
  );
}
