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
import type { DailyTaskListItem } from '../types';
import { computeCalendarDayCounts } from '../utils/task-metrics';
import { localDateInputValue } from '../utils/local-date';

const CALENDAR = {
  totalText: '#5B35B5',
  totalBg: '#F3EEFF',
  todo: '#64748B',
  inProgress: '#2563EB',
  review: '#D97706',
  completed: '#16A34A',
  overdue: '#DC2626',
  border: '#E8E8EF',
  headerBg: '#F8F9FC',
  todayBg: '#F3EEFF',
  todayRing: '#5B35B5',
  selectedRing: '#8B6BD6',
} as const;

function monthRange(year: number, monthIndex: number): { weeks: (string | null)[][] } {
  const first = new Date(year, monthIndex, 1);
  const last = new Date(year, monthIndex + 1, 0);
  const startPad = first.getDay();
  const daysInMonth = last.getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(localDateInputValue(new Date(year, monthIndex, d)));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return { weeks };
}

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
      className="min-w-0 whitespace-nowrap text-[8.5px] leading-none tabular-nums sm:text-[9px]"
      style={{ color: textColor }}
    >
      {label}: <span className="font-semibold">{value}</span>
    </div>
  );
}

function DayCell({
  dateKey,
  dayTasks,
  isToday,
  isSelected,
  onSelectDate,
}: {
  dateKey: string;
  dayTasks: readonly DailyTaskListItem[];
  isToday: boolean;
  isSelected: boolean;
  onSelectDate: (date: string) => void;
}) {
  const counts = computeCalendarDayCounts(dayTasks);
  const fullDate = formatFullDate(dateKey);
  const dayNumber = Number(dateKey.slice(8, 10));
  const isEmpty = counts.total === 0;
  const muted = isEmpty;

  const dateIndicatorClass = cn(
    'flex size-8 shrink-0 items-center justify-center rounded-[9px] text-[14px] font-semibold tabular-nums leading-none',
    !isToday && 'bg-[#F1F2F5] text-[#293244]',
    isToday && 'border border-[#5B35B5] bg-[#F3EEFF] text-[#5B35B5]',
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex min-h-[5.25rem] w-full min-w-0 flex-col overflow-hidden border-b border-r pt-1 pr-1.5 pb-2.5 pl-1.5 text-left transition-[background-color,box-shadow] duration-200 last:border-r-0',
            'bg-white hover:bg-[#FAFAFF] hover:shadow-sm hover:ring-1 hover:ring-inset hover:ring-[#C4B5FD]',
          )}
          style={{
            borderColor: CALENDAR.border,
            backgroundColor: isSelected ? '#F9F7FF' : undefined,
            boxShadow: isSelected ? `inset 0 0 0 1px ${CALENDAR.selectedRing}` : undefined,
          }}
          onClick={() => onSelectDate(dateKey)}
        >
          <div className="flex shrink-0 min-w-0 items-center justify-between gap-1">
            <span className={dateIndicatorClass}>{dayNumber}</span>
            <span
              className={cn(
                'min-w-0 shrink rounded-full px-1 py-px text-[8px] font-semibold leading-none whitespace-nowrap tabular-nums',
                muted && 'bg-[#F1F5F9] text-slate-400',
              )}
              style={
                !muted
                  ? { backgroundColor: CALENDAR.totalBg, color: CALENDAR.totalText }
                  : undefined
              }
            >
              {taskCountLabel(counts.total)}
            </span>
          </div>
          <div className="mt-1 flex min-h-0 flex-1 flex-col">
            <div className="grid min-w-0 grid-cols-2 gap-x-1 gap-y-1.5">
              <StatusRow label="To Do" value={counts.todo} color={CALENDAR.todo} muted={muted} />
              <StatusRow
                label="In Progress"
                value={counts.inProgress}
                color={CALENDAR.inProgress}
                muted={muted}
              />
              <StatusRow label="Review" value={counts.review} color={CALENDAR.review} muted={muted} />
              <StatusRow
                label="Completed"
                value={counts.completed}
                color={CALENDAR.completed}
                muted={muted}
              />
            </div>
            <div className="min-h-0 flex-1" aria-hidden />
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
        <p className="text-[11px] font-semibold tabular-nums" style={{ color: CALENDAR.totalText }}>
          {taskCountLabel(counts.total)}
        </p>
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 pt-0.5">
          <StatusRow label="To Do" value={counts.todo} color={CALENDAR.todo} />
          <StatusRow label="In Progress" value={counts.inProgress} color={CALENDAR.inProgress} />
          <StatusRow label="Review" value={counts.review} color={CALENDAR.review} />
          <StatusRow label="Completed" value={counts.completed} color={CALENDAR.completed} />
        </div>
        {counts.overdue > 0 ? (
          <StatusRow label="Overdue" value={counts.overdue} color={CALENDAR.overdue} />
        ) : null}
      </TooltipContent>
    </Tooltip>
  );
}

export function DailyTaskCalendarView({
  anchorDate,
  selectedDate,
  tasks,
  onAnchorChange,
  onSelectDate,
  loading,
}: {
  anchorDate: string;
  selectedDate?: string;
  tasks: readonly DailyTaskListItem[];
  onAnchorChange: (date: string) => void;
  onSelectDate: (date: string) => void;
  loading?: boolean;
}) {
  const monthKey = anchorDate.slice(0, 7);
  const { weeks, monthLabelDate } = useMemo(() => {
    const parsed = new Date(`${monthKey}-01T12:00:00`);
    const year = parsed.getFullYear();
    const monthIndex = parsed.getMonth();
    return { ...monthRange(year, monthIndex), monthLabelDate: parsed };
  }, [monthKey]);

  const byDate = useMemo(() => {
    const map = new Map<string, DailyTaskListItem[]>();
    for (const task of tasks) {
      const list = map.get(task.assignDate) ?? [];
      list.push(task);
      map.set(task.assignDate, list);
    }
    return map;
  }, [tasks]);

  const monthLabel = monthLabelDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const clientToday = localDateInputValue();

  const shiftMonth = (delta: number) => {
    const d = new Date(`${monthKey}-01T12:00:00`);
    d.setMonth(d.getMonth() + delta);
    onAnchorChange(localDateInputValue(d));
  };

  const navButtonClass =
    'size-8 shrink-0 rounded-lg border border-[#E8E8EF] bg-white text-slate-600 shadow-xs hover:bg-[#F8F9FC] hover:text-[#5B35B5]';

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
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-lg border-[#E8E8EF] bg-white text-slate-700 shadow-xs hover:border-[#C4B5FD] hover:bg-[#F3EEFF] hover:text-[#5B35B5]"
            onClick={() => onAnchorChange(clientToday)}
          >
            Today
          </Button>
        </div>
        <div
          className="overflow-visible rounded-lg border bg-[#F8F9FC] shadow-sm"
          style={{ borderColor: CALENDAR.border }}
        >
          <div
            className="grid grid-cols-7 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500"
            style={{ backgroundColor: CALENDAR.headerBg, borderBottom: `1px solid ${CALENDAR.border}` }}
          >
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="border-r px-1 py-2.5 last:border-r-0" style={{ borderColor: CALENDAR.border }}>
                {d}
              </div>
            ))}
          </div>
          {weeks.map((week, wi) => (
            <div key={wi} className="grid min-w-0 grid-cols-7 [&>*]:min-w-0">
              {week.map((dateKey, di) => {
                if (!dateKey) {
                  return (
                    <div
                      key={`${wi}-${di}`}
                      className="min-h-[5.25rem] border-b border-r bg-white last:border-r-0"
                      style={{ borderColor: CALENDAR.border }}
                      aria-hidden
                    />
                  );
                }
                const dayTasks = byDate.get(dateKey) ?? [];
                return (
                  <DayCell
                    key={dateKey}
                    dateKey={dateKey}
                    dayTasks={dayTasks}
                    isToday={dateKey === clientToday}
                    isSelected={Boolean(selectedDate && dateKey === selectedDate)}
                    onSelectDate={onSelectDate}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}
