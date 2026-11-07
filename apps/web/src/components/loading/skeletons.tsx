import type { ComponentProps, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/shared/lib/utils';

export function TextSkeleton({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn('grid gap-2', className)} aria-hidden>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn('h-3.5', i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}

export function AvatarSkeleton({ className, ...props }: ComponentProps<'div'>) {
  return <Skeleton className={cn('size-10 rounded-full', className)} {...props} />;
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('bg-card grid gap-3 rounded-lg border p-4', className)} aria-hidden>
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
      <TextSkeleton lines={2} />
    </div>
  );
}

export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <div className="flex items-center gap-3 py-2" aria-hidden>
      {Array.from({ length: columns }, (_, i) => (
        <Skeleton key={i} className={cn('h-4 flex-1', i === columns - 1 && 'max-w-16')} />
      ))}
    </div>
  );
}

export function TableSkeleton({
  rows = 6,
  columns = 5,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn('bg-card grid gap-2 rounded-lg border p-4', className)} aria-busy="true">
      <div className="mb-2 flex gap-3">
        {Array.from({ length: columns }, (_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <TableRowSkeleton key={i} columns={columns} />
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('grid gap-2', className)} aria-busy="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
          <AvatarSkeleton className="size-8" />
          <div className="grid min-w-0 flex-1 gap-2">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function FormSkeleton({ fields = 4, className }: { fields?: number; className?: string }) {
  return (
    <div className={cn('grid gap-4', className)} aria-busy="true">
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="grid gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
      <Skeleton className="h-9 w-28" />
    </div>
  );
}

export function DashboardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('grid gap-4', className)} aria-busy="true">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <ChartSkeleton />
        <ListSkeleton rows={4} />
      </div>
    </div>
  );
}

export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('bg-card grid gap-3 rounded-lg border p-4', className)} aria-hidden>
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

export function ModalSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('grid gap-4 p-1', className)} aria-busy="true">
      <Skeleton className="h-5 w-40" />
      <FormSkeleton fields={3} />
    </div>
  );
}

export function ImageSkeleton({ className, ...props }: ComponentProps<'div'>) {
  return <Skeleton className={cn('aspect-video w-full', className)} {...props} />;
}

/** Application chrome + content placeholder while session or permissions initialize. */
export function WorkspaceShellSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'bg-background relative flex h-dvh max-h-dvh min-w-0 overflow-hidden',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading workspace"
    >
      <aside className="admin-sidebar-shell hidden h-full w-[var(--workspace-sidebar-width)] max-w-[var(--workspace-sidebar-width)] shrink-0 bg-white lg:block print:hidden">
        <div className="flex h-full min-h-0 flex-col gap-3 px-3 pt-4 pb-2">
          <Skeleton className="mx-0.5 h-8 w-36" />
          <div className="mt-2 grid gap-1.5">
            {Array.from({ length: 10 }, (_, index) => (
              <Skeleton key={index} className="h-9 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </aside>
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 border-b border-border bg-white px-4 sm:px-5">
          <div className="flex h-[var(--workspace-header-height)] items-center justify-between gap-3">
            <Skeleton className="h-6 w-44 max-w-[50vw]" />
            <div className="flex items-center gap-2">
              <Skeleton className="size-9 rounded-lg" />
              <Skeleton className="size-9 rounded-full" />
            </div>
          </div>
        </div>
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
          <PageSkeleton className="max-w-[1400px] p-0" />
        </main>
      </div>
    </div>
  );
}

/** Stable page shell used by route `loading.tsx` files so navigation never flashes blank. */
export function PageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('mx-auto grid w-full max-w-[1400px] gap-4 p-4 sm:p-5', className)} aria-busy="true">
      <div className="grid gap-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-56" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="size-9" />
        <Skeleton className="size-9" />
      </div>
      <TableSkeleton rows={8} columns={5} />
    </div>
  );
}

export function AsyncRegion({
  status,
  skeleton,
  error,
  onRetry,
  empty,
  children,
}: {
  status: 'loading' | 'error' | 'empty' | 'ready';
  skeleton: ReactNode;
  error?: ReactNode;
  onRetry?: () => void;
  empty?: ReactNode;
  children: ReactNode;
}) {
  if (status === 'loading') return <>{skeleton}</>;
  if (status === 'error') {
    return (
      <div className="grid gap-2" role="alert">
        {error ?? <p className="text-destructive text-sm">Something went wrong.</p>}
        {onRetry ? (
          <Button type="button" variant="outline" size="sm" className="w-fit" onClick={onRetry}>
            Retry
          </Button>
        ) : null}
      </div>
    );
  }
  if (status === 'empty') return <>{empty ?? null}</>;
  return <>{children}</>;
}
