'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Loader2, MonitorSmartphone, ShieldCheck } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { describeUserAgent, formatDateTime } from '@/shared/lib/format';
import { API_ERROR_CODES } from '@techwin/contracts';
import { isApiError } from '@/shared/api/api-error';
import { listSessions, revokeSession } from '../api/list-sessions';
import type { PlatformSessionSummary } from '../types/auth.types';
import { describeAuthError } from '../utils/auth-errors';
import { useAdminSession, useAuthenticatedAdmin } from '../hooks/use-admin-session';

export function AdminDashboard() {
  const { admin, session } = useAuthenticatedAdmin();
  const { signOutEverywhere, isSigningOut } = useAdminSession();

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-6">
      <header className="grid min-w-0 gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Signed in as {admin.displayName}. Sessions are restored on reload and expire after seven
          days of inactivity.
        </p>
      </header>

      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>Administrator</CardTitle>
          <CardDescription>Identity confirmed by the API for this session.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Info label="Name" value={admin.displayName} />
          <Info label="Email" value={admin.email} />
          <Info label="Role" value={admin.role.replaceAll('_', ' ')} />
          <Info label="Last sign-in" value={formatDateTime(admin.lastLoginAt)} />
          <Info label="This session" value={session.id} />
          <Info label="Session expires" value={formatDateTime(session.expiresAt)} />
        </CardContent>
      </Card>

      <SessionList currentSessionId={session.id} />

      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>Sign out everywhere</CardTitle>
          <CardDescription>
            Revokes every active session for this account, including this browser.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void signOutEverywhere()}
            disabled={isSigningOut}
          >
            {isSigningOut ? 'Signing out...' : 'Sign out all devices'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{label}</p>
      <p className="mt-1 truncate text-sm font-medium" title={value}>
        {value}
      </p>
    </div>
  );
}

function SessionList({ currentSessionId }: { currentSessionId: string }) {
  const [sessions, setSessions] = useState<readonly PlatformSessionSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const result = await listSessions(controller.signal);
        if (controller.signal.aborted) return;
        setError(null);
        setSessions(result.sessions);
      } catch (failure) {
        if (controller.signal.aborted) return;
        setError(describeAuthError(failure));
      }
    })();
    return () => controller.abort();
  }, [reloadKey]);

  const onRevoke = async (sessionId: string) => {
    setPendingId(sessionId);
    setError(null);
    try {
      await revokeSession(sessionId);
      setReloadKey((value) => value + 1);
    } catch (failure) {
      if (isApiError(failure) && failure.code === API_ERROR_CODES.SESSION_NOT_FOUND) {
        setReloadKey((value) => value + 1);
      } else setError(describeAuthError(failure));
    } finally {
      setPendingId(null);
    }
  };

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Active sessions</CardTitle>
        <CardDescription>
          Revoke a device you do not recognize. Refresh tokens rotate on every use.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {error ? (
          <Alert variant="destructive" role="alert">
            <AlertCircle aria-hidden="true" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {sessions === null && !error ? (
          <div className="grid gap-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : null}

        {sessions?.map((item) => (
          <div
            key={item.id}
            className="flex min-w-0 items-start gap-3 rounded-lg border p-3 sm:items-center"
          >
            <MonitorSmartphone
              className="text-muted-foreground mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-medium">{describeUserAgent(item.userAgent)}</p>
                {item.current || item.id === currentSessionId ? (
                  <Badge variant="success">
                    <ShieldCheck aria-hidden="true" />
                    This device
                  </Badge>
                ) : null}
              </div>
              <p className="text-muted-foreground mt-1 text-xs">
                Last active {formatDateTime(item.lastActiveAt)}
                {item.ipAddress ? ` · ${item.ipAddress}` : ''}
              </p>
            </div>
            {item.current || item.id === currentSessionId ? null : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                disabled={pendingId === item.id}
                onClick={() => void onRevoke(item.id)}
              >
                {pendingId === item.id ? (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                ) : null}
                Revoke
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
