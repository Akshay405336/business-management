'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CRM_PIPELINE_SEARCH_INPUT_CLASS } from '@/features/admin/crm/constants';
import { cn } from '@/shared/lib/utils';
import {
  CALENDAR_MONTH_OPTIONS,
  calendarYearOptions,
  localTodayKey,
  monthBounds,
  monthKeyFromParts,
  shiftMonth,
} from '../utils/calendar-month';

const SELECT_TRIGGER = cn(CRM_PIPELINE_SEARCH_INPUT_CLASS, 'h-9 shadow-xs');

export function AttendanceCalendarMonthNav({
  visibleMonth,
  onVisibleMonthChange,
  loading,
}: {
  visibleMonth: string;
  onVisibleMonthChange: (monthKey: string) => void;
  loading?: boolean;
}) {
  const { year, monthIndex } = monthBounds(visibleMonth);
  const today = localTodayKey();
  const isViewingCurrentMonth = visibleMonth === today.slice(0, 7);
  const years = calendarYearOptions(new Date().getFullYear(), 10);

  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-2 sm:justify-start">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={cn('size-9 shrink-0 shadow-xs', CRM_PIPELINE_SEARCH_INPUT_CLASS)}
        aria-label="Previous month"
        onClick={() => onVisibleMonthChange(shiftMonth(visibleMonth, -1))}
      >
        <ChevronLeft className="size-4" />
      </Button>

      <Select
        value={String(monthIndex)}
        onValueChange={(value) => onVisibleMonthChange(monthKeyFromParts(year, Number(value)))}
      >
        <SelectTrigger aria-label="Select month" className={cn(SELECT_TRIGGER, 'w-[min(9.5rem,42vw)]')}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="start" className="max-h-64">
          {CALENDAR_MONTH_OPTIONS.map((option) => (
            <SelectItem key={option.monthIndex} value={String(option.monthIndex)}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={String(year)}
        onValueChange={(value) => onVisibleMonthChange(monthKeyFromParts(Number(value), monthIndex))}
      >
        <SelectTrigger aria-label="Select year" className={cn(SELECT_TRIGGER, 'w-[min(6.5rem,28vw)] tabular-nums')}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="start" className="max-h-64">
          {years.map((optionYear) => (
            <SelectItem key={optionYear} value={String(optionYear)}>
              {optionYear}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        type="button"
        variant="outline"
        size="icon"
        className={cn('size-9 shrink-0 shadow-xs', CRM_PIPELINE_SEARCH_INPUT_CLASS)}
        aria-label="Next month"
        onClick={() => onVisibleMonthChange(shiftMonth(visibleMonth, 1))}
      >
        <ChevronRight className="size-4" />
      </Button>

      {isViewingCurrentMonth ? (
        <span className="rounded-md border border-[#E8E8EF] bg-[#F8F9FC] px-2 py-0.5 text-[10px] font-medium tracking-wide text-[#5B35B5] uppercase">
          Current month
        </span>
      ) : null}

      {loading ? <span className="text-muted-foreground text-xs">Updating…</span> : null}
    </div>
  );
}
