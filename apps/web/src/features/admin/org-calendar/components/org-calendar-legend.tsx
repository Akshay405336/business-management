'use client';

import { ORG_CALENDAR_LEGEND_ITEMS } from '../constants/org-calendar-theme';

export function OrgCalendarLegend({ className }: { className?: string }) {
  return (
    <div
      className={`flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground ${className ?? ''}`}
      aria-label="Calendar legend"
    >
      {ORG_CALENDAR_LEGEND_ITEMS.map((item) => (
        <span key={item.key} className="inline-flex items-center gap-1.5">
          <span
            className={`size-3 shrink-0 rounded-sm border ${item.sampleClass}`}
            aria-hidden
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}
