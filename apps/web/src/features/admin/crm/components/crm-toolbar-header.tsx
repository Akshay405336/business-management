'use client';

import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';

/** Search field ~220–280px on desktop; shrinks with available space. */
export const CRM_HEADER_SEARCH_FORM_CLASS =
  'min-w-0 w-full max-w-full flex-[1_1_14rem] sm:w-[min(280px,100%)] sm:max-w-[280px]';

export const CRM_HEADER_TOOLBAR_CONTROLS_CLASS =
  'flex min-w-0 max-w-full flex-[1_1_auto] flex-wrap items-center gap-2 sm:justify-end';

export function CrmToolbarHeader({
  title,
  description,
  toolbar,
  className,
  titleSectionClassName,
  descriptionClassName,
}: {
  title: string;
  description: string;
  toolbar: ReactNode;
  className?: string;
  titleSectionClassName?: string;
  descriptionClassName?: string;
}) {
  return (
    <header
      className={cn(
        'border-border/60 bg-card/40 max-w-full min-w-0 rounded-lg border px-4 py-3 sm:px-5',
        className,
      )}
    >
      <div className="flex min-w-0 max-w-full flex-wrap items-center gap-x-4 gap-y-3">
        <div
          className={cn(
            'min-w-0 flex-[1_1_12rem] basis-full sm:basis-auto sm:max-w-[min(100%,22rem)] lg:max-w-[min(100%,26rem)]',
            titleSectionClassName,
          )}
        >
          <h1 className="text-foreground text-lg font-semibold tracking-tight sm:text-xl">
            {title}
          </h1>
          <p
            className={cn(
              'text-muted-foreground mt-0.5 text-sm leading-snug',
              descriptionClassName,
            )}
          >
            {description}
          </p>
        </div>
        <div className={CRM_HEADER_TOOLBAR_CONTROLS_CLASS}>{toolbar}</div>
      </div>
    </header>
  );
}
