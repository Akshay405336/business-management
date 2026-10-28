'use client';

import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';

/** Search field ~220–280px on desktop; shrinks with available space. */
export const CRM_HEADER_SEARCH_FORM_CLASS =
  'min-w-0 w-full max-w-full flex-[1_1_14rem] sm:w-[min(280px,100%)] sm:max-w-[280px]';

export const CRM_HEADER_TOOLBAR_CONTROLS_CLASS =
  'flex min-w-0 max-w-full flex-[1_1_auto] flex-wrap items-center gap-2 sm:justify-end';

export const CRM_HEADER_TOOLBAR_ROW_CLASS =
  'flex min-w-0 w-full max-w-full flex-wrap items-center gap-2 lg:flex-nowrap';

const TITLE_SECTION_CLASS =
  'min-w-0 flex-[1_1_12rem] basis-full sm:basis-auto sm:max-w-[min(100%,22rem)] lg:max-w-[min(100%,26rem)]';

export function CrmToolbarHeader({
  title,
  description,
  toolbar,
  className,
  titleSectionClassName,
  descriptionClassName,
  layout = 'inline',
  toolbarRowClassName,
  bottomRow,
}: {
  title: string;
  description: string;
  toolbar: ReactNode;
  className?: string;
  titleSectionClassName?: string;
  descriptionClassName?: string;
  /** `stacked`: title row, then full-width toolbar row. */
  layout?: 'inline' | 'stacked';
  toolbarRowClassName?: string;
  /** Full-width row below title/filters (e.g. lifecycle tabs). */
  bottomRow?: ReactNode;
}) {
  const titleBlock = (
    <div
      className={cn(
        bottomRow || layout !== 'stacked'
          ? TITLE_SECTION_CLASS
          : 'min-w-0 w-full max-w-full',
        titleSectionClassName,
      )}
    >
      <h1 className="type-page-title">{title}</h1>
      <p
        className={cn('text-muted-foreground mt-0.5 text-sm leading-snug', descriptionClassName)}
      >
        {description}
      </p>
    </div>
  );

  const toolbarBlock = (
    <div
      className={cn(
        bottomRow
          ? cn(
              CRM_HEADER_TOOLBAR_CONTROLS_CLASS,
              'w-full basis-full justify-start sm:w-auto sm:basis-auto sm:justify-end',
              toolbarRowClassName,
            )
          : layout === 'stacked'
            ? cn(CRM_HEADER_TOOLBAR_ROW_CLASS, toolbarRowClassName)
            : CRM_HEADER_TOOLBAR_CONTROLS_CLASS,
        toolbarRowClassName && !bottomRow && layout !== 'stacked' ? toolbarRowClassName : null,
      )}
    >
      {toolbar}
    </div>
  );

  const headerRow =
    bottomRow || layout === 'inline' ? (
      <div
        className={cn(
          'flex min-w-0 max-w-full flex-wrap items-center gap-x-4 gap-y-3',
          bottomRow && 'justify-between',
        )}
      >
        {titleBlock}
        {toolbarBlock}
      </div>
    ) : (
      <div className="flex min-w-0 max-w-full flex-col gap-3">
        {titleBlock}
        {toolbarBlock}
      </div>
    );

  return (
    <header
      className={cn(
        'workspace-toolbar',
        className,
      )}
    >
      {bottomRow ? (
        <div className="flex min-w-0 max-w-full flex-col gap-3">
          {headerRow}
          <div className="min-w-0 w-full max-w-full">{bottomRow}</div>
        </div>
      ) : (
        headerRow
      )}
    </header>
  );
}
