'use client';

import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';

export function TaskCalendarHeader({ toolbar }: { toolbar: ReactNode }) {
  return (
    <div className="border-border bg-card shadow-sm">
      <div
        className={cn(
          'flex min-w-0 flex-col gap-2 border-b border-[#E8E8EF] px-4 py-2 sm:px-5',
          /* sm+ (640px): one row with heading + toolbar — md was too wide and stacked title + controls on common laptop widths */
          'sm:flex-row sm:items-center sm:gap-3 sm:gap-y-0',
          'rounded-t-lg',
        )}
      >
        <h1 className="type-page-title shrink-0 leading-tight">Task Calendar</h1>
        <div className="min-w-0 flex-1">{toolbar}</div>
      </div>
    </div>
  );
}
