'use client';

import { cn } from '@/shared/lib/utils';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export function AttendanceCalendarGridSkeleton({
  compact,
  equalGrid,
  boardStyle,
}: {
  compact?: boolean;
  equalGrid?: boolean;
  boardStyle?: boolean;
}) {
  if (boardStyle) {
    return (
      <div className="w-full min-w-0 animate-pulse" aria-hidden="true">
        <div className="mb-2 grid grid-cols-7 gap-2">
          {WEEKDAYS.map((label) => (
            <div key={label} className="text-center text-xs font-bold text-transparent">
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 grid-rows-6 gap-2">
          {Array.from({ length: 42 }).map((_, index) => (
            <div key={index} className="bg-muted/40 min-h-[4.5rem] rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('w-full min-w-0 animate-pulse', !equalGrid && !compact && 'min-w-[36rem]')} aria-hidden="true">
      <div className="mb-0 grid grid-cols-7 border-b text-center text-[11px] font-medium uppercase">
        {WEEKDAYS.map((label) => (
          <div key={label} className="border-r py-2 last:border-r-0">
            {label}
          </div>
        ))}
      </div>
      {Array.from({ length: 5 }).map((_, weekIndex) => (
        <div key={weekIndex} className="grid grid-cols-7">
          {Array.from({ length: 7 }).map((__, dayIndex) => (
            <div
              key={dayIndex}
              className={cn(
                'border-b border-r bg-muted/30 last:border-r-0',
                equalGrid
                  ? 'aspect-square w-full min-h-0 p-2'
                  : compact
                    ? 'min-h-[3.75rem] p-1.5'
                    : 'min-h-[6.25rem] p-2',
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
