/** @deprecated Portals removed — use `AdminAccessProvider` + `canAccessAppPath` instead. */
'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import type { PortalKind } from '../portal/portal-resolution';
import { usePermissions } from './permissions-provider';

export function PortalGate({
  portal,
  children,
}: {
  portal: PortalKind;
  children: ReactNode;
}) {
  const router = useRouter();
  const access = usePermissions();
  const allowed = access.portal === portal;

  useEffect(() => {
    if (!allowed) router.replace(access.defaultDashboard);
  }, [access.defaultDashboard, allowed, router]);

  if (!allowed) {
    return (
      <div className="bg-background flex min-h-dvh items-center justify-center px-4">
        <p className="text-muted-foreground flex items-center gap-2 text-sm" role="status" aria-live="polite">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Redirecting…
        </p>
      </div>
    );
  }

  return children;
}
