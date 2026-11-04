'use client';

import type { AttendanceCalendarDaySummary } from '@techwin/contracts';
import { CalendarOff } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/shared/lib/utils';
import {
  ATTENDANCE_CALENDAR_SURFACE,
  ATTENDANCE_STATUS_VISUAL,
  attendanceCalendarTodayRingClass,
  CALENDAR_CELL_MAX_STATUS_LINES,
  type AttendanceCalendarStatusKey,
  calendarStatusSlices,
  resolveAttendanceCalendarDayCardStyle,
} from '../constants/attendance-calendar-theme';

function StatusRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex min-w-0 items-center gap-1 text-[9px] leading-tight tabular-nums sm:text-[10px]">
      <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
      <span className="font-medium whitespace-nowrap" style={{ color }}>
        {label}
      </span>
      <span className="text-[#64748B]">{value}</span>
    </div>
  );
}

const BOARD_STATUS_TEXT: Record<
  AttendanceCalendarStatusKey,
  { className: string; label: (n: number) => string }
> = {
  PRESENT: { className: 'text-[#16A34A]', label: (n) => `Present ${n}` },
  LATE: { className: 'text-[#EA580C]', label: (n) => `Late ${n}` },
  ABSENT: { className: 'text-[#DC2626]', label: (n) => `Absent ${n}` },
  HALF_DAY: { className: 'text-[#9333EA]', label: (n) => `Half Day ${n}` },
  HOLIDAY: { className: 'text-[#64748B]', label: (n) => `Holiday ${n}` },
  WEEKLY_OFF: { className: 'text-[#6D28D9]', label: () => 'Weekly Off' },
  ON_LEAVE: { className: 'text-[#0284C7]', label: (n) => `On leave ${n}` },
  PENDING: { className: 'text-[#D97706]', label: (n) => `Pending ${n}` },
};

function BoardStatusLine({ statusKey, value }: { statusKey: AttendanceCalendarStatusKey; value: number }) {
  const row = BOARD_STATUS_TEXT[statusKey];
  const weeklyOff = statusKey === 'WEEKLY_OFF';
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1 truncate text-[11px] font-semibold sm:text-xs',
        row.className,
      )}
    >
      {weeklyOff ? <CalendarOff className="size-3 shrink-0 opacity-80" aria-hidden /> : null}
      {row.label(value)}
    </span>
  );
}

function weekdayShortLabel(dateKey: string): string {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short' });
}

function isOrgWeeklyOff(summary: AttendanceCalendarDaySummary | null): boolean {
  return summary?.organizationDayKind === 'WEEKLY_OFF';
}

function isOrgHoliday(summary: AttendanceCalendarDaySummary | null): boolean {
  const kind = summary?.organizationDayKind;
  return kind === 'HOLIDAY' || kind === 'OFFICE_CLOSURE';
}

function isOrgHalfDay(summary: AttendanceCalendarDaySummary | null): boolean {
  return summary?.organizationDayKind === 'HALF_DAY';
}

function orgDayPrimaryLabel(summary: AttendanceCalendarDaySummary | null): string {
  if (!summary) return '';
  return summary.organizationDayLabel || 'Organisation calendar';
}

function boardAttendanceLines(
  summary: AttendanceCalendarDaySummary | null,
): { key: AttendanceCalendarStatusKey; value: number }[] {
  if (!summary || summary.total <= 0) return [];
  const lines: { key: AttendanceCalendarStatusKey; value: number }[] = [];
  if (summary.present > 0) lines.push({ key: 'PRESENT', value: summary.present });
  if (summary.late > 0) lines.push({ key: 'LATE', value: summary.late });
  if (summary.absent > 0) lines.push({ key: 'ABSENT', value: summary.absent });
  if (summary.halfDay > 0) lines.push({ key: 'HALF_DAY', value: summary.halfDay });
  if (summary.pending > 0) lines.push({ key: 'PENDING', value: summary.pending });
  return lines;
}

export function AttendanceCalendarDayCell({
  dateKey,
  summary,
  isSelected,
  isCurrentMonth,
  compact,
  equalGrid,
  boardStyle,
  orgTodayKey,
  tabIndex,
  onSelect,
}: {
  dateKey: string;
  summary: AttendanceCalendarDaySummary | null;
  isSelected: boolean;
  isCurrentMonth: boolean;
  compact?: boolean;
  equalGrid?: boolean;
  boardStyle?: boolean;
  orgTodayKey: string;
  tabIndex: number;
  onSelect: (date: string) => void;
}) {
  const dayNumber = Number(dateKey.slice(8, 10));
  const isToday = dateKey === orgTodayKey;
  const isFuture = dateKey > orgTodayKey;
  const cardStyle = resolveAttendanceCalendarDayCardStyle({
    dateKey,
    organizationDayKind: summary?.organizationDayKind,
    isCurrentMonth,
    orgTodayKey,
  });

  const primaryKeys = compact || equalGrid || boardStyle ? (['PRESENT', 'LATE', 'ABSENT', 'HALF_DAY'] as const) : null;
  const slices = calendarStatusSlices(summary).filter(
    (slice) => !primaryKeys || (primaryKeys as readonly string[]).includes(slice.key),
  );
  const maxLines = boardStyle ? 2 : equalGrid ? 2 : compact ? 2 : CALENDAR_CELL_MAX_STATUS_LINES;
  const visible = slices.slice(0, maxLines);
  const hiddenCount = slices.length - visible.length;
  const total = summary?.total ?? 0;
  const attendanceLines = boardAttendanceLines(summary);
  const showOrgLabel = summary && (isOrgWeeklyOff(summary) || isOrgHoliday(summary) || isOrgHalfDay(summary));

  const tooltipLines =
    showOrgLabel
      ? `${orgDayPrimaryLabel(summary)}${total > 0 ? ` · ${total} record${total === 1 ? '' : 's'}` : ''}`
      : calendarStatusSlices(summary).length > 0
        ? calendarStatusSlices(summary)
            .map((slice) => `${ATTENDANCE_STATUS_VISUAL[slice.key].label}: ${slice.value}`)
            .join(' · ')
        : isFuture
          ? 'No records yet'
          : 'No attendance recorded';

  const cellSurfaceClass = cn(
    'border transition-[box-shadow,transform,background-color] duration-200 ease-out',
    cardStyle.bg,
    cardStyle.border,
    cardStyle.text,
    attendanceCalendarTodayRingClass(isToday, isSelected),
    !isSelected && !isToday && 'shadow-sm hover:-translate-y-px hover:shadow-md',
    isSelected && !isToday && 'shadow-[0_0_0_1px_rgba(139,107,214,0.35),0_4px_12px_rgba(91,53,181,0.12)]',
  );

  if (boardStyle) {
    const dayName = weekdayShortLabel(dateKey);

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            role="gridcell"
            tabIndex={tabIndex}
            aria-selected={isSelected}
            aria-label={`${dateKey}, ${total} records`}
            onClick={() => onSelect(dateKey)}
            className={cn(
              'flex h-full min-h-[4.75rem] w-full min-w-0 flex-col rounded-lg p-2 text-left',
              'focus-visible:ring-2 focus-visible:ring-[#8B6BD6] focus-visible:outline-none',
              cellSurfaceClass,
              cardStyle.mutedContent && 'opacity-80',
            )}
          >
            <div className="mb-1 flex items-start justify-between gap-1">
              <span className={cn('rounded-md px-1.5 py-0.5 text-sm tabular-nums', cardStyle.dayNumberClass)}>
                {dayNumber}
              </span>
              <span className={cn('text-[10px] font-semibold tracking-wide uppercase', cardStyle.text, 'opacity-80')}>
                {dayName}
              </span>
            </div>
            <div className="mt-auto flex min-h-0 flex-col gap-0.5 leading-tight">
              {showOrgLabel ? (
                <span className={cn('truncate text-[11px] font-semibold', cardStyle.text)}>
                  {orgDayPrimaryLabel(summary)}
                </span>
              ) : null}
              {attendanceLines.length > 0 ? (
                attendanceLines.map((line) => (
                  <BoardStatusLine key={line.key} statusKey={line.key} value={line.value} />
                ))
              ) : !showOrgLabel ? (
                <span className="text-[11px] font-medium text-[#94A3B8]">
                  {isFuture ? 'Upcoming' : 'No records'}
                </span>
              ) : null}
            </div>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          {tooltipLines}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          role="gridcell"
          tabIndex={tabIndex}
          aria-selected={isSelected}
          aria-label={`${dateKey}, ${total} records`}
          onClick={() => onSelect(dateKey)}
          className={cn(
            'group flex w-full min-w-0 flex-col text-left last:border-r-0',
            equalGrid ? 'aspect-square min-h-0 p-2' : compact ? 'min-h-[3.75rem] p-1.5' : 'min-h-[6.25rem] p-2',
            'border-b border-r',
            'focus-visible:ring-2 focus-visible:ring-[#8B6BD6] focus-visible:outline-none',
            cellSurfaceClass,
            cardStyle.mutedContent && 'opacity-75',
          )}
          style={{
            borderColor: ATTENDANCE_CALENDAR_SURFACE.border,
            boxShadow:
              isSelected && !isToday
                ? `inset 0 0 0 2px ${ATTENDANCE_CALENDAR_SURFACE.selectedRing}`
                : undefined,
          }}
        >
          <span
            className={cn(
              'mb-1 flex shrink-0 items-center justify-center rounded-md tabular-nums transition-colors',
              equalGrid ? 'size-7 text-xs' : compact ? 'size-6 text-[11px]' : 'mb-1.5 size-7 text-xs',
              cardStyle.dayNumberClass,
            )}
          >
            {dayNumber}
          </span>

          {showOrgLabel ? (
            <span className={cn('mt-auto text-[9px] font-semibold leading-snug', cardStyle.text)}>
              {orgDayPrimaryLabel(summary)}
            </span>
          ) : null}

          {total > 0 ? (
            <div className="grid min-h-0 min-w-0 flex-1 content-start gap-0.5 overflow-hidden">
              {visible.map((slice) => {
                const visual = ATTENDANCE_STATUS_VISUAL[slice.key];
                return (
                  <StatusRow key={slice.key} label={visual.label} value={slice.value} color={visual.color} />
                );
              })}
              {hiddenCount > 0 ? (
                <span className="text-[9px] font-medium text-[#64748B]">+{hiddenCount} more</span>
              ) : null}
            </div>
          ) : !showOrgLabel ? (
            <span className="text-muted-foreground/80 mt-auto text-[9px] leading-snug">
              {isFuture ? 'Upcoming' : 'No records'}
            </span>
          ) : null}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs">
        {tooltipLines}
      </TooltipContent>
    </Tooltip>
  );
}
