'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { getMyPermissions } from '@/features/admin/org-access/api/org-access';
import { resolvePostAuthRedirect } from '@/features/auth/portal/portal-resolution';
import { accessTokenStore, hasCsrfCookie } from '@/shared/api/api-client';
import { getCurrentSession } from '../api/get-current-session';

/**
 * TOTP verification is only for Super Admin after password login. If the user
 * already has a live session (password-only org sign-in), skip this step.
 * A failed `/me` here is expected: the password step has not created a session yet.
 */
export function VerifyTotpGate({ children }: { children: ReactNode }) {
  const router = useRouter();
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
        const { permissions } = await getMyPermissions(controller.signal);
        if (!controller.signal.aborted) {
          router.replace(
            resolvePostAuthRedirect({ admin: session.admin, permissions }),
          );
        }
      } catch {
        if (!controller.signal.aborted) setReady(true);
      }
    })();
    return () => controller.abort();
  }, [router]);

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
