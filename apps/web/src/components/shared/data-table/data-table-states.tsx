import { AlertCircle, Inbox, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from '@/components/ui/table';
import { cn } from '@/shared/lib/utils';

export type DataTableEmptyStateContent = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
};

export function DataTableEmptyStateRow({
  colSpan,
  content,
  className,
}: {
  colSpan: number;
  content: DataTableEmptyStateContent;
  className?: string;
}) {
  const Icon = content.icon ?? Inbox;
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className={cn('p-0', className)}>
        <div className="flex flex-col items-center justify-center gap-2 px-6 py-8 text-center">
          <Icon className="text-muted-foreground size-9 opacity-50" aria-hidden="true" />
          <div className="grid max-w-md gap-1">
            <p className="text-foreground text-sm font-medium">{content.title}</p>
            {content.description ? (
              <p className="text-muted-foreground text-sm">{content.description}</p>
            ) : null}
          </div>
          {content.action || content.secondaryAction ? (
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              {content.secondaryAction ? (
                <Button type="button" variant="outline" size="sm" onClick={content.secondaryAction.onClick}>
                  {content.secondaryAction.label}
                </Button>
              ) : null}
              {content.action ? (
                <Button type="button" size="sm" onClick={content.action.onClick}>
                  {content.action.label}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </TableCell>
    </TableRow>
  );
}

export function DataTableErrorStateRow({
  colSpan,
  message,
  onRetry,
  className,
}: {
  colSpan: number;
  message: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className={cn('p-0', className)}>
        <div
          className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center"
          role="alert"
        >
          <AlertCircle className="text-destructive size-10 opacity-80" aria-hidden="true" />
          <div className="grid max-w-md gap-1">
            <p className="text-foreground text-sm font-medium">Could not load data</p>
            <p className="text-muted-foreground text-sm">{message}</p>
          </div>
          {onRetry ? (
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          ) : null}
        </div>
      </TableCell>
    </TableRow>
  );
}

export function DataTableBodyRefreshOverlay({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <div className="relative">
      {active ? (
        <div
          className="bg-background/40 pointer-events-none absolute inset-0 z-[1] motion-reduce:opacity-60"
          aria-hidden="true"
        >
          <div className="bg-primary/20 h-0.5 w-full animate-pulse motion-reduce:animate-none" />
        </div>
      ) : null}
      {children}
    </div>
  );
}
