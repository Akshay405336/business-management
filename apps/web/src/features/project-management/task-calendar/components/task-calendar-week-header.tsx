'use client';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export function TaskCalendarWeekHeader() {
  return (
    <div className="grid grid-cols-7 border-x border-t border-b border-[#E8E8EF] bg-muted/40">
      {DAYS.map((d) => (
        <div
          key={d}
          className="px-1 py-2 text-center text-xs font-semibold tracking-wide text-foreground sm:text-[13px]"
        >
          {d}
        </div>
      ))}
    </div>
  );
}
