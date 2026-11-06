'use client';

import {
  DISPLAY_STATUS_LABEL,
  TASK_CALENDAR_LEGEND_STATUSES,
  taskCalendarLegendDotHex,
} from '../utils/calendar-task.utils';

export function TaskCalendarStatusLegend() {
  return (
    <div className="border-border mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-3 text-[11px] sm:text-xs">
      {TASK_CALENDAR_LEGEND_STATUSES.map((key) => {
        const dotHex = taskCalendarLegendDotHex(key);
        return (
          <div key={key} className="flex items-center gap-1.5">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: dotHex }}
              aria-hidden
            />
            <span className="text-muted-foreground">{DISPLAY_STATUS_LABEL[key]}</span>
          </div>
        );
      })}
    </div>
  );
}
