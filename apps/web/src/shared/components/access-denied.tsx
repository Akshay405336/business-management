'use client';

import { ShieldOff } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/features/auth/components/permissions-provider';

export function AccessDenied({
  title = 'Access denied',
  description = "You don't have permission to view this page.",
}: {
  title?: string;
  description?: string;
}) {
  const { defaultDashboard } = usePermissions();
  return (
    <div className="workspace-surface flex min-h-[40vh] flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      <ShieldOff className="text-muted-foreground size-10 stroke-[1.25]" aria-hidden="true" />
      <div className="max-w-md space-y-1">
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      <Button type="button" variant="outline" asChild>
        <Link href={defaultDashboard}>Back to dashboard</Link>
      </Button>
    </div>
  );
}
