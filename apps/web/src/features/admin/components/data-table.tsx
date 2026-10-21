import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';

export function DataTableFrame({
  children,
  footer,
  className,
}: {
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('grid gap-3', className)}>
      <div className="bg-card overflow-hidden rounded-xl shadow-md">{children}</div>
      {footer ? <div>{footer}</div> : null}
    </div>
  );
}
