'use client';

import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';

/** Desktop search width ~304–360px; shrinks on smaller breakpoints. */
export const CRM_HEADER_SEARCH_FORM_CLASS =
  'w-full min-w-0 sm:min-w-[10rem] sm:max-w-[min(100%,360px)] lg:w-[19rem] lg:max-w-[360px] lg:shrink-0';

export const CRM_HEADER_TOOLBAR_CONTROLS_CLASS =
  'flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:flex-nowrap lg:justify-end lg:gap-2';

export function CrmToolbarHeader({
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
    <header
      className={cn(
        'border-border/60 bg-card/40 rounded-lg border px-4 py-3 sm:px-5',
        className,
      )}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <div className="min-w-0 shrink-0">
          <h1 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
            {title}
          </h1>
          <p className="text-muted-foreground mt-0.5 text-sm leading-snug max-lg:max-w-md lg:whitespace-nowrap">
            {description}
          </p>
        </div>
        <div className={CRM_HEADER_TOOLBAR_CONTROLS_CLASS}>{toolbar}</div>
      </div>
    </header>
  );
}
