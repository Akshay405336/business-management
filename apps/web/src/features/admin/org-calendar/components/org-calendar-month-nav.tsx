'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { localTodayKey, shiftMonth } from '@/features/admin/attendance/utils/calendar-month';
import { OrgCalendarLegend } from './org-calendar-legend';

export function OrgCalendarMonthNav({
  monthKey,
  monthIndex,
  year,
  search,
  onMonthKeyChange,
  onSearchChange,
  onToday,
  showSearch = true,
}: {
  monthKey: string;
  monthIndex: number;
  year: number;
  search: string;
  onMonthKeyChange: (key: string) => void;
  onSearchChange: (value: string) => void;
  onToday: () => void;
  showSearch?: boolean;
}) {
  const monthLabel = new Date(year, monthIndex, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-3 border-b border-border/60 bg-[#FAFBFD] px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-9 rounded-lg bg-white shadow-sm"
          onClick={() => onMonthKeyChange(shiftMonth(monthKey, -1))}
          aria-label="Previous month"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <p className="min-w-[9rem] px-1 text-center text-sm font-semibold text-[#1E293B] tabular-nums">
          {monthLabel}
        </p>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-9 rounded-lg bg-white shadow-sm"
          onClick={() => onMonthKeyChange(shiftMonth(monthKey, 1))}
          aria-label="Next month"
        >
          <ChevronRight className="size-4" />
        </Button>
        <Button type="button" variant="secondary" size="sm" className="rounded-lg" onClick={onToday}>
          Today
        </Button>
        {showSearch ? (
          <Input
            placeholder="Search events…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="ml-auto h-9 max-w-[14rem] rounded-lg bg-white shadow-sm"
          />
        ) : null}
      </div>
      <OrgCalendarLegend />
    </div>
  );
}

export { localTodayKey };
