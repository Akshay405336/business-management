'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { hasCsrfCookie } from '@/shared/api/api-client';
import { isApiError } from '@/shared/api/api-error';
import { getCurrentSession } from '../api/get-current-session';
import { loginPath } from '../utils/auth-errors';

/**
 * TOTP verification is only for Super Admin after password login. If the user
 * already has a live session (password-only org sign-in), skip this step.
 */
export function VerifyTotpGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      if (!hasCsrfCookie()) {
        setReady(true);
        return;
      }
      try {
        await getCurrentSession(controller.signal);
        if (!controller.signal.aborted) {
          router.replace('/admin/dashboard');
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        if (isApiError(error) && !error.isTransient) {
          router.replace(loginPath('session_expired'));
          return;
        }
        setReady(true);
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
