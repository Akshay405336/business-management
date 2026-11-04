'use client';

import type { AttendanceCalendarDaySummary } from '@techwin/contracts';
import { Lightbulb } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CRM_PIPELINE_SEARCH_INPUT_CLASS } from '@/features/admin/crm/constants';
import { cn } from '@/shared/lib/utils';
import { ATTENDANCE_CALENDAR_SURFACE } from '../constants/attendance-calendar-theme';
import { useAttendanceCalendarMonth } from '../hooks/use-attendance-calendar-month';
import { todayKeyInTimeZone, monthGridBoardWeeks, monthGridWeeks } from '../utils/calendar-month';
import { useAttendanceOrgTimeZone } from '../hooks/use-attendance-org-timezone';
import { useAttendanceRecordsContext } from './attendance-records-context';
import { AttendanceCalendarDayCell } from './attendance-calendar-day-cell';
import { AttendanceCalendarGridSkeleton } from './attendance-calendar-grid-skeleton';
import { AttendanceCalendarLegend } from './attendance-calendar-legend';
import { AttendanceCalendarMonthNav } from './attendance-calendar-month-nav';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

function summaryForDate(
  days: readonly AttendanceCalendarDaySummary[],
  dateKey: string,
): AttendanceCalendarDaySummary | null {
  return days.find((day) => day.date === dateKey) ?? null;
}

function addDays(dateKey: string, delta: number): string {
  const date = new Date(`${dateKey}T12:00:00`);
  date.setDate(date.getDate() + delta);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function AttendanceCalendarMonthGrid({
  enabled,
  variant = 'default',
  selectedDate,
  onDateSelect,
}: {
  enabled: boolean;
  variant?: 'default' | 'popup';
  selectedDate: string;
  onDateSelect: (dateKey: string) => void;
}) {
  const isPopup = variant === 'popup';
  const boardStyle = isPopup;
  const ctx = useAttendanceRecordsContext();
  const gridRef = useRef<HTMLDivElement>(null);
  const orgTimeZone = useAttendanceOrgTimeZone();
  const orgTodayKey = useMemo(() => todayKeyInTimeZone(orgTimeZone), [orgTimeZone]);

  const { days, loading, error, retry, range } = useAttendanceCalendarMonth({
    visibleMonth: ctx.visibleMonth,
    search: ctx.search,
    statusFilter: ctx.statusFilter,
    calendarRefreshToken: ctx.calendarRefreshToken,
    enabled,
    expandToBoard: boardStyle,
  });

  const boardWeeks = useMemo(
    () => monthGridBoardWeeks(range.year, range.monthIndex),
    [range.year, range.monthIndex],
  );
  const classicWeeks = useMemo(() => monthGridWeeks(range.year, range.monthIndex), [range.year, range.monthIndex]);

  const monthDates = useMemo(
    () =>
      boardStyle
        ? boardWeeks.flatMap((week) => week.map((cell) => cell.dateKey))
        : classicWeeks.flatMap((week) => week.filter((date): date is string => date !== null)),
    [boardStyle, boardWeeks, classicWeeks],
  );

  const monthLabel = new Date(range.year, range.monthIndex, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  const [previewDate, setPreviewDate] = useState(selectedDate || ctx.date || orgTodayKey);

  useEffect(() => {
    if (!enabled) return;
    const initial = selectedDate || ctx.date || orgTodayKey;
    setPreviewDate(initial);
    ctx.setVisibleMonth(initial.slice(0, 7));
  }, [enabled, selectedDate, ctx.date, orgTodayKey, ctx.setVisibleMonth]);

  const pickDate = useCallback(
    (dateKey: string) => {
      onDateSelect(dateKey);
    },
    [onDateSelect],
  );

  const focusDate = useCallback(
    (dateKey: string) => {
      setPreviewDate(dateKey);
      ctx.setVisibleMonth(dateKey.slice(0, 7));
      requestAnimationFrame(() => {
        const cell = gridRef.current?.querySelector<HTMLElement>(`[data-date="${dateKey}"]`);
        cell?.focus();
      });
    },
    [ctx],
  );

  const goToday = useCallback(() => {
    ctx.setVisibleMonth(orgTodayKey.slice(0, 7));
    setPreviewDate(orgTodayKey);
  }, [ctx, orgTodayKey]);

  const onGridKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const anchor = previewDate || monthDates[0];
      if (!anchor) return;
      let next: string | null = null;
      if (event.key === 'ArrowLeft') next = addDays(anchor, -1);
      if (event.key === 'ArrowRight') next = addDays(anchor, 1);
      if (event.key === 'ArrowUp') next = addDays(anchor, -7);
      if (event.key === 'ArrowDown') next = addDays(anchor, 7);
      if (event.key === 'Home') next = monthDates[0] ?? anchor;
      if (event.key === 'End') next = monthDates[monthDates.length - 1] ?? anchor;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        pickDate(anchor);
        return;
      }
      if (!next) return;
      event.preventDefault();
      focusDate(next);
    },
    [focusDate, monthDates, pickDate, previewDate],
  );

  const showSkeleton = enabled && loading && days.length === 0;
  const highlightDate = previewDate;
  const equalGrid = isPopup && !boardStyle;
  const cellCompact = !isPopup && variant !== 'default';

  return (
    <TooltipProvider delayDuration={200}>
      <div className="grid min-w-0 gap-0">
        <div
          className={cn(
            'border-b',
            isPopup ? 'px-4 py-2 sm:px-5' : 'flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5',
          )}
          style={{ borderColor: ATTENDANCE_CALENDAR_SURFACE.border, backgroundColor: '#FFFFFF' }}
        >
          {isPopup ? (
            <AttendanceCalendarMonthNav
              visibleMonth={ctx.visibleMonth}
              onVisibleMonthChange={ctx.setVisibleMonth}
              loading={loading && days.length > 0}
            />
          ) : null}
        </div>

        <AttendanceCalendarLegend compact={cellCompact} popup={isPopup} boardStyle={boardStyle} />

        {error ? (
          <div className={cn(isPopup ? 'px-4 py-2 sm:px-5' : 'px-4 py-3 sm:px-5')}>
            <Alert variant="destructive" role="alert">
              <AlertDescription className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
                <span>{error}</span>
                <Button type="button" variant="outline" size="sm" className="h-8 bg-card" onClick={retry}>
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        ) : null}

        <div className={cn(boardStyle ? 'overflow-visible bg-white p-3 sm:p-4' : 'overflow-y-auto bg-white', !boardStyle && 'max-h-[min(52vh,28rem)]')}>
          {showSkeleton ? (
            <AttendanceCalendarGridSkeleton compact={cellCompact} boardStyle={boardStyle} />
          ) : boardStyle ? (
            <div
              ref={gridRef}
              className="w-full min-w-0"
              role="grid"
              aria-label={`Attendance calendar for ${monthLabel}`}
              onKeyDown={onGridKeyDown}
            >
              <div className="mb-2 grid grid-cols-7 gap-2 text-center text-xs font-bold tracking-wide text-[#334155] uppercase">
                {WEEKDAYS.map((label) => (
                  <div key={label} role="columnheader">
                    {label}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 grid-rows-6 gap-2">
                {boardWeeks.flatMap((week) =>
                  week.map((cell) => (
                    <div key={cell.dateKey} data-date={cell.dateKey} className="min-h-0 min-w-0">
                      <AttendanceCalendarDayCell
                        dateKey={cell.dateKey}
                        summary={summaryForDate(days, cell.dateKey)}
                        isSelected={cell.dateKey === highlightDate}
                        isCurrentMonth={cell.inMonth}
                        orgTodayKey={orgTodayKey}
                        boardStyle
                        tabIndex={cell.dateKey === highlightDate ? 0 : -1}
                        onSelect={pickDate}
                      />
                    </div>
                  )),
                )}
              </div>
            </div>
          ) : (
            <div
              ref={gridRef}
              className="w-full min-w-0"
              role="grid"
              aria-label={`Attendance calendar for ${monthLabel}`}
              onKeyDown={onGridKeyDown}
            >
              <div
                className="sticky top-0 z-[1] grid grid-cols-7 border-b text-center text-[11px] font-medium tracking-wide text-[#64748B] uppercase sm:text-xs"
                style={{
                  borderColor: ATTENDANCE_CALENDAR_SURFACE.border,
                  backgroundColor: ATTENDANCE_CALENDAR_SURFACE.headerBg,
                }}
                role="row"
              >
                {WEEKDAYS.map((label) => (
                  <div
                    key={label}
                    role="columnheader"
                    className="border-r py-2.5 last:border-r-0 sm:py-3"
                    style={{ borderColor: ATTENDANCE_CALENDAR_SURFACE.border }}
                  >
                    {label}
                  </div>
                ))}
              </div>
              {classicWeeks.map((week, weekIndex) => (
                <div key={weekIndex} className={cn('grid grid-cols-7', equalGrid && 'auto-rows-[1fr]')} role="row">
                  {week.map((dateKey, cellIndex) =>
                    dateKey ? (
                      <div key={dateKey} data-date={dateKey} className="min-w-0">
                        <AttendanceCalendarDayCell
                          dateKey={dateKey}
                          summary={summaryForDate(days, dateKey)}
                          isSelected={dateKey === highlightDate}
                          isCurrentMonth
                          orgTodayKey={orgTodayKey}
                          compact={cellCompact}
                          equalGrid={equalGrid}
                          tabIndex={dateKey === highlightDate ? 0 : -1}
                          onSelect={pickDate}
                        />
                      </div>
                    ) : (
                      <div
                        key={`empty-${weekIndex}-${cellIndex}`}
                        className={cn(
                          'border-b border-r bg-[#F8F9FC]/80 last:border-r-0',
                          equalGrid ? 'aspect-square w-full min-h-0' : cellCompact ? 'min-h-[3.75rem]' : 'min-h-[6.25rem]',
                        )}
                        style={{ borderColor: ATTENDANCE_CALENDAR_SURFACE.border }}
                        role="gridcell"
                        aria-hidden="true"
                      />
                    ),
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {boardStyle ? (
          <div
            className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 sm:px-5"
            style={{ borderColor: ATTENDANCE_CALENDAR_SURFACE.border, backgroundColor: '#FFFFFF' }}
          >
            <p className="text-muted-foreground flex min-w-0 flex-1 items-center gap-2 text-xs sm:text-sm">
              <Lightbulb className="size-4 shrink-0 text-amber-500" aria-hidden="true" />
              Click any date to view that day&apos;s attendance in the records table.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn('h-9 shrink-0 px-4 shadow-xs', CRM_PIPELINE_SEARCH_INPUT_CLASS)}
              onClick={goToday}
            >
              Today
            </Button>
          </div>
        ) : (
          <p
            className="text-muted-foreground border-t px-4 py-2 text-center text-[11px] sm:px-5"
            style={{ borderColor: ATTENDANCE_CALENDAR_SURFACE.border }}
          >
            Click a date to filter attendance records for that day.
          </p>
        )}
      </div>
    </TooltipProvider>
  );
}
