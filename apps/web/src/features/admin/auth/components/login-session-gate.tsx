'use client';

import { Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { getMyPermissions } from '@/features/admin/org-access/api/org-access';
import { resolvePostAuthRedirect } from '@/features/auth/portal/portal-resolution';
import { accessTokenStore, hasCsrfCookie } from '@/shared/api/api-client';
import { getCurrentSession } from '../api/get-current-session';

/**
 * If the visitor already has a valid session, send them to the correct portal
 * without flashing the login form.
 */
export function LoginSessionGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      if (!hasCsrfCookie() && !accessTokenStore.get()) {
        setReady(true);
        return;
      }
      try {
        const session = await getCurrentSession(controller.signal);
        if (controller.signal.aborted) return;
        const { permissions, roles } = await getMyPermissions(controller.signal);
        if (controller.signal.aborted) return;
        const destination = resolvePostAuthRedirect({
          admin: session.admin,
          permissions,
          roles: roles ?? [],
          returnTo: searchParams.get('returnTo'),
        });
        router.replace(destination);
      } catch {
        if (!controller.signal.aborted) setReady(true);
      }
    })();
    return () => controller.abort();
  }, [router, searchParams]);

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-muted-foreground flex items-center gap-2 text-sm" role="status">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Checking sign-in…
        </p>
      </div>
    );
  }

  return children;
}
