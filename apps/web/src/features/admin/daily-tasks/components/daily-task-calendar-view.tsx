'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/shared/lib/utils';
import type { OrgCalendarMonthDay } from '@techwin/contracts';
import {
  ATTENDANCE_CALENDAR_SURFACE,
  attendanceCalendarTodayRingClass,
  resolveAttendanceCalendarDayCardStyle,
} from '@/features/admin/attendance/constants/attendance-calendar-theme';
import { monthGridBoardWeeks, monthBounds } from '@/features/admin/attendance/utils/calendar-month';
import { OrgCalendarDayCardLegend } from '@/features/admin/shared/calendar/org-calendar-day-card-legend';
import type { DailyTaskListItem } from '../types';
import { computeCalendarDayCounts } from '../utils/task-metrics';
import { localDateInputValue } from '../utils/local-date';

const EMPTY_ORG_DAYS = new Map<string, OrgCalendarMonthDay>();

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

const TASK_COUNT = {
  totalText: '#5B35B5',
  totalBg: '#F3EEFF',
  todo: '#64748B',
  inProgress: '#2563EB',
  review: '#D97706',
  completed: '#16A34A',
  overdue: '#DC2626',
} as const;

function formatFullDate(dateKey: string): string {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function taskCountLabel(total: number): string {
  return `${total} Task${total === 1 ? '' : 's'}`;
}

function orgClassificationLabel(
  orgDay: OrgCalendarMonthDay | undefined,
  cardVariant: ReturnType<typeof resolveAttendanceCalendarDayCardStyle>['variant'],
): string | null {
  if (!orgDay) return null;
  const kind = orgDay.dayKind;
  if (kind === 'HOLIDAY' || kind === 'OFFICE_CLOSURE' || kind === 'WEEKLY_OFF' || kind === 'HALF_DAY') {
    const title = orgDay.events[0]?.title?.trim();
    if (title) return title;
    switch (cardVariant) {
      case 'holiday':
        return 'Holiday';
      case 'weeklyOff':
        return 'Weekly off';
      default:
        return kind === 'HALF_DAY' ? 'Half working day' : null;
    }
  }
  return null;
}

function StatusRow({
  label,
  value,
  color,
  muted,
}: {
  label: string;
  value: number;
  color: string;
  muted?: boolean;
}) {
  const textColor = muted ? '#94A3B8' : color;
  return (
    <div
      className="min-w-0 truncate text-[8.5px] leading-tight tabular-nums sm:text-[9px]"
      style={{ color: textColor }}
    >
      {label}: <span className="font-semibold">{value}</span>
    </div>
  );
}

function DayCell({
  dateKey,
  dayTasks,
  orgDay,
  isCurrentMonth,
  orgTodayKey,
  isSelected,
  onSelectDate,
}: {
  dateKey: string;
  dayTasks: readonly DailyTaskListItem[];
  orgDay: OrgCalendarMonthDay | undefined;
  isCurrentMonth: boolean;
  orgTodayKey: string;
  isSelected: boolean;
  onSelectDate: (date: string) => void;
}) {
  const counts = computeCalendarDayCounts(dayTasks);
  const fullDate = formatFullDate(dateKey);
  const dayNumber = Number(dateKey.slice(8, 10));
  const isToday = dateKey === orgTodayKey;
  const isEmpty = counts.total === 0;
  const muted = isEmpty;

  const cardStyle = resolveAttendanceCalendarDayCardStyle({
    dateKey,
    organizationDayKind: orgDay?.dayKind,
    isCurrentMonth,
    orgTodayKey,
  });
  const orgLabel = orgClassificationLabel(orgDay, cardStyle.variant);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          role="gridcell"
          className={cn(
            'flex h-full min-h-[4.75rem] w-full min-w-0 flex-col rounded-lg border p-2 text-left',
            'transition-[box-shadow,transform,background-color] duration-200 ease-out',
            'focus-visible:ring-2 focus-visible:ring-[#8B6BD6] focus-visible:outline-none',
            cardStyle.bg,
            cardStyle.border,
            cardStyle.text,
            attendanceCalendarTodayRingClass(isToday, isSelected),
            !isSelected && !isToday && 'shadow-sm hover:-translate-y-px hover:shadow-md',
            isSelected && !isToday && 'shadow-[0_0_0_1px_rgba(139,107,214,0.35),0_4px_12px_rgba(91,53,181,0.12)]',
            cardStyle.mutedContent && 'opacity-80',
          )}
          onClick={() => onSelectDate(dateKey)}
        >
          <div className="mb-1 flex items-start justify-between gap-1">
            <span className={cn('rounded-md px-1.5 py-0.5 text-sm tabular-nums', cardStyle.dayNumberClass)}>
              {dayNumber}
            </span>
            <span
              className={cn(
                'min-w-0 shrink rounded-full px-1 py-px text-[8px] font-semibold leading-none whitespace-nowrap tabular-nums',
                muted && 'bg-[#F1F5F9] text-slate-400',
              )}
              style={
                !muted
                  ? { backgroundColor: TASK_COUNT.totalBg, color: TASK_COUNT.totalText }
                  : undefined
              }
            >
              {taskCountLabel(counts.total)}
            </span>
          </div>
          {orgLabel ? (
            <p className={cn('truncate text-[10px] font-semibold leading-tight', cardStyle.text)}>{orgLabel}</p>
          ) : null}
          <div className="mt-auto grid min-w-0 grid-cols-2 gap-x-1 gap-y-0.5 pt-0.5">
            <StatusRow label="To Do" value={counts.todo} color={TASK_COUNT.todo} muted={muted} />
            <StatusRow label="In Prog." value={counts.inProgress} color={TASK_COUNT.inProgress} muted={muted} />
            <StatusRow label="Review" value={counts.review} color={TASK_COUNT.review} muted={muted} />
            <StatusRow label="Done" value={counts.completed} color={TASK_COUNT.completed} muted={muted} />
          </div>
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="center"
        sideOffset={8}
        className="max-w-[14rem] space-y-1 border border-[#E8E8EF] bg-white px-3 py-2.5 text-left shadow-md"
      >
        <p className="text-xs font-semibold text-slate-800">{fullDate}</p>
        {orgLabel ? <p className={cn('text-[11px] font-semibold', cardStyle.text)}>{orgLabel}</p> : null}
        <p className="text-[11px] font-semibold tabular-nums" style={{ color: TASK_COUNT.totalText }}>
          {taskCountLabel(counts.total)}
        </p>
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 pt-0.5">
          <StatusRow label="To Do" value={counts.todo} color={TASK_COUNT.todo} />
          <StatusRow label="In Progress" value={counts.inProgress} color={TASK_COUNT.inProgress} />
          <StatusRow label="Review" value={counts.review} color={TASK_COUNT.review} />
          <StatusRow label="Completed" value={counts.completed} color={TASK_COUNT.completed} />
        </div>
        {counts.overdue > 0 ? (
          <StatusRow label="Overdue" value={counts.overdue} color={TASK_COUNT.overdue} />
        ) : null}
      </TooltipContent>
    </Tooltip>
  );
}

export function DailyTaskCalendarView({
  anchorDate,
  selectedDate,
  tasks,
  orgDaysByDate = EMPTY_ORG_DAYS,
  orgTodayKey: orgTodayKeyProp,
  onAnchorChange,
  onSelectDate,
  loading,
}: {
  anchorDate: string;
  selectedDate?: string;
  tasks: readonly DailyTaskListItem[];
  orgDaysByDate?: ReadonlyMap<string, OrgCalendarMonthDay>;
  orgTodayKey?: string;
  onAnchorChange: (date: string) => void;
  onSelectDate: (date: string) => void;
  loading?: boolean;
}) {
  const orgTodayKey = orgTodayKeyProp ?? localDateInputValue();
  const monthKey = anchorDate.slice(0, 7);
  const { year, monthIndex } = useMemo(() => monthBounds(monthKey), [monthKey]);
  const boardWeeks = useMemo(() => monthGridBoardWeeks(year, monthIndex), [year, monthIndex]);

  const byDate = useMemo(() => {
    const map = new Map<string, DailyTaskListItem[]>();
    for (const task of tasks) {
      const list = map.get(task.assignDate) ?? [];
      list.push(task);
      map.set(task.assignDate, list);
    }
    return map;
  }, [tasks]);

  const monthLabel = new Date(year, monthIndex, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  const shiftMonth = (delta: number) => {
    const d = new Date(`${monthKey}-01T12:00:00`);
    d.setMonth(d.getMonth() + delta);
    onAnchorChange(localDateInputValue(d));
  };

  const navButtonClass =
    'size-8 shrink-0 rounded-lg border border-[#E8E8EF] bg-white text-slate-600 shadow-xs hover:bg-[#F8F9FC] hover:text-[#5B35B5]';

  const highlightDate = selectedDate ?? '';

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-0 flex-1 flex-col gap-3 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className={navButtonClass}
                aria-label="Previous month"
                onClick={() => shiftMonth(-1)}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className={navButtonClass}
                aria-label="Next month"
                onClick={() => shiftMonth(1)}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <h3 className="text-base font-semibold tracking-tight text-slate-800">{monthLabel}</h3>
            <Input
              type="month"
              aria-label="Month and year"
              className="h-8 w-[9.5rem] shrink-0 rounded-lg border-[#E8E8EF] bg-[#F8F9FC] text-xs shadow-xs"
              value={monthKey}
              onChange={(e) => {
                const value = e.target.value;
                if (/^\d{4}-\d{2}$/.test(value)) onAnchorChange(`${value}-01`);
              }}
            />
            {loading ? <span className="text-xs text-slate-400">Loading…</span> : null}
          </div>
          <OrgCalendarDayCardLegend className="hidden max-w-[32rem] lg:flex" />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-lg border-[#E8E8EF] bg-white text-slate-700 shadow-xs hover:border-[#C4B5FD] hover:bg-[#F3EEFF] hover:text-[#5B35B5]"
            onClick={() => onAnchorChange(orgTodayKey)}
          >
            Today
          </Button>
        </div>
        <OrgCalendarDayCardLegend className="lg:hidden" />
        <div
          className="overflow-visible rounded-lg border bg-white p-3 shadow-sm sm:p-4"
          style={{ borderColor: ATTENDANCE_CALENDAR_SURFACE.border }}
        >
          <div className="mb-2 grid grid-cols-7 gap-2 text-center text-xs font-bold tracking-wide text-[#334155] uppercase">
            {WEEKDAYS.map((label) => (
              <div key={label} role="columnheader">
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 grid-rows-6 gap-2" role="grid" aria-label={`Task calendar for ${monthLabel}`}>
            {boardWeeks.flatMap((week) =>
              week.map((cell) => (
                <div key={cell.dateKey} className="min-h-0 min-w-0">
                  <DayCell
                    dateKey={cell.dateKey}
                    dayTasks={byDate.get(cell.dateKey) ?? []}
                    orgDay={orgDaysByDate.get(cell.dateKey)}
                    isCurrentMonth={cell.inMonth}
                    orgTodayKey={orgTodayKey}
                    isSelected={cell.dateKey === highlightDate}
                    onSelectDate={onSelectDate}
                  />
                </div>
              )),
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
