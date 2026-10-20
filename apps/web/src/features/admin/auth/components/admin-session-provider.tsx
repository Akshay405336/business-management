'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { hasCsrfCookie, onSessionEnded, registerSessionRefresher } from '@/shared/api/api-client';
import { isApiError } from '@/shared/api/api-error';
import { getCurrentSession } from '../api/get-current-session';
import { logout, logoutAllDevices } from '../api/logout';
import { refreshSession } from '../api/refresh-session';
import type { AdminSessionState } from '../types/auth.types';
import { describeAuthError, loginPath } from '../utils/auth-errors';
import { AdminSessionContext, type AdminSessionContextValue } from '../hooks/use-admin-session';

export function AdminSessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AdminSessionState>({ status: 'loading' });
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
        if (leaveIntentionally.current) return;
        setState({ status: 'unauthenticated' });
        router.replace(loginPath('session_expired'));
      }),
    [router],
  );

  useEffect(() => {
    const controller = new AbortController();

    void (async () => {
      try {
        if (!hasCsrfCookie()) {
          setState({ status: 'unauthenticated' });
          router.replace(loginPath());
          return;
        }
        const current = await getCurrentSession(controller.signal);
        if (controller.signal.aborted) return;
        setState({
          status: 'authenticated',
          admin: current.admin,
          session: current.session,
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        if (isApiError(error) && error.isTransient) {
          setState({ status: 'error', error });
          return;
        }
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
