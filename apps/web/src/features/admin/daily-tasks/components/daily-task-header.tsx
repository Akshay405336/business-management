'use client';

import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';

export function DailyTaskHeader({
  title,
  description,
  toolbar,
  className,
}: {
  title: string;
  description: string;
  toolbar: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('workspace-toolbar rounded-none border-0 bg-card shadow-none', className)}>
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="type-page-title text-nowrap max-sm:text-wrap max-sm:text-balance">{title}</h1>
          <p className="text-muted-foreground mt-0.5 text-sm leading-snug">{description}</p>
        </div>
        <div className="flex w-full min-w-0 shrink-0 flex-wrap items-center justify-start gap-2 sm:w-auto sm:justify-end">
          {toolbar}
        </div>
      </div>
    </header>
  );
}
