'use client';

import type { TaskCalendarTaskDto } from '@techwin/contracts';
import { CalendarCheck, Plus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/shared/lib/utils';
import {
  resolveTaskCalendarCellBorderVariant,
  type TaskCalendarCellBorderVariant,
} from '../utils/calendar-task.utils';
import { TaskCalendarOverflow } from './task-calendar-overflow';
import { TaskCalendarTaskChip } from './task-calendar-task-chip';

/**
 * Border colors for day cells — every variant string must appear literally here so Tailwind v4
 * includes the utilities (dynamic/constructed class names are not scanned).
 */
const TASK_CALENDAR_CELL_BORDER_COLOR_CLASS: Record<TaskCalendarCellBorderVariant, string> = {
  sunday: 'border-[#9333EA]',
  completed: 'border-[#22C55E]',
  upcoming: 'border-[#3B82F6]',
  default: 'border-[#E8E8EF]',
};

const DATE_PILL_CLASS =
  'flex size-7 shrink-0 items-center justify-center rounded-md bg-[#F0F1F4] p-0 text-[11px] font-semibold tabular-nums text-[#374151] transition-colors hover:bg-[#E5E7EB] sm:text-xs';

const MAX_VISIBLE_CHIPS = 2;

export function TaskCalendarDayCell({
  date,
  displayMonthKey,
  clientToday,
  isSunday,
  isToday,
  isSelected,
  isFirstCol,
  taskCount,
  assigneeCount,
  tasks,
  contentLoading = false,
  onOpenTask,
  onSelectDate,
  onNavigateToDailyKanban,
}: {
  date: string;
  /** View month `YYYY-MM` — compare with `date.slice(0, 7)` only (not “today’s month”). */
  displayMonthKey: string;
  clientToday: string;
  /** Sun–Sat grid: first column is Sunday (`di === 0`). */
  isSunday: boolean;
  isToday: boolean;
  isSelected: boolean;
  isFirstCol: boolean;
  taskCount: number;
  assigneeCount: number;
  tasks: readonly TaskCalendarTaskDto[];
  /** Shimmer inside this cell only. The cell shell stays mounted. */
  contentLoading?: boolean;
  onOpenTask: (task: TaskCalendarTaskDto) => void;
  onSelectDate: (date: string) => void;
  onNavigateToDailyKanban: (date: string) => void;
}) {
  const dayNum = Number(date.slice(8, 10));
  const inDisplayedMonth = date.slice(0, 7) === displayMonthKey;

  const visible = tasks.slice(0, MAX_VISIBLE_CHIPS);
  const overflow = Math.max(0, taskCount - MAX_VISIBLE_CHIPS);

  const summary =
    taskCount === 0
      ? null
      : `${taskCount} task${taskCount === 1 ? '' : 's'} • ${assigneeCount} ${
          assigneeCount === 1 ? 'person' : 'people'
        }`;

  const handleDayClick = () => {
    onSelectDate(date);
    onNavigateToDailyKanban(date);
  };

  const isEmpty = taskCount === 0;

  const borderVariant = resolveTaskCalendarCellBorderVariant(date, clientToday, isSunday, tasks);
  const borderColorClass = TASK_CALENDAR_CELL_BORDER_COLOR_CLASS[borderVariant];

  return (
    <div
      className={cn(
        'box-border flex h-full min-h-0 w-full min-w-0 flex-col gap-1 overflow-hidden border-r border-b border-solid p-1 text-left sm:p-1.5',
        inDisplayedMonth ? 'bg-white' : 'bg-[#F5F6F8]',
        borderColorClass,
        isFirstCol && 'border-l border-solid',
      )}
      aria-busy={contentLoading || undefined}
    >
      {contentLoading ? (
        <div className="flex flex-col gap-1" aria-hidden>
          <div className="flex w-full items-center justify-between gap-1">
            <Skeleton className="size-7 rounded-md" />
            <Skeleton className="h-5 w-6 rounded-md" />
          </div>
          <Skeleton className="h-3 w-[72%] max-w-[7rem]" />
          <Skeleton className="h-5 w-full rounded-md" />
          <Skeleton className="h-5 w-[88%] rounded-md" />
        </div>
      ) : (
        <>
      {/* Top: date pill (left) + task count badge (right) */}
      <div className="flex w-full min-w-0 items-center justify-between gap-1">
        <button
          type="button"
          className={cn(
            DATE_PILL_CLASS,
            !inDisplayedMonth && 'bg-[#E8EAED] text-[#9CA3AF] hover:bg-[#D1D5DB]',
            isToday && !isSelected && 'ring-2 ring-primary/30',
            isSelected && 'ring-2 ring-primary',
          )}
          onClick={handleDayClick}
          aria-label={`Open daily tasks for ${date}`}
        >
          {dayNum}
        </button>
        <span
          className={cn(
            'rounded-md px-1.5 py-0.5 text-center text-[10px] font-semibold tabular-nums',
            inDisplayedMonth
              ? 'bg-[#EDE9FE] text-[#5B21B6]'
              : 'bg-[#E8EAED] text-[#9CA3AF]',
          )}
          aria-label={`${taskCount} tasks`}
        >
          {taskCount}
        </span>
      </div>

      {summary ? (
        <button
          type="button"
          onClick={handleDayClick}
          className={cn(
            'line-clamp-1 w-full min-w-0 truncate text-left text-[10px] leading-tight sm:text-[11px]',
            inDisplayedMonth
              ? 'text-muted-foreground hover:text-foreground'
              : 'text-[#9CA3AF] hover:text-[#6B7280]',
          )}
          aria-label={`${summary} on ${date}`}
        >
          {summary}
        </button>
      ) : null}

      {isEmpty ? (
        <div
          className={cn(
            'flex min-h-0 flex-1 flex-col items-center justify-center gap-2 py-1',
            !inDisplayedMonth && 'text-[#9CA3AF]',
          )}
        >
          <div
            className={cn(
              'flex items-center gap-1.5',
              inDisplayedMonth ? 'text-muted-foreground' : 'text-[#9CA3AF]',
            )}
          >
            <CalendarCheck className="size-4 shrink-0" aria-hidden />
            <span className="text-[10px] font-medium sm:text-[11px]">No tasks</span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDayClick();
            }}
            className={cn(
              'inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold transition-colors sm:text-[11px]',
              inDisplayedMonth
                ? 'bg-[#F5F3FF] text-[#5B21B6] hover:bg-[#EDE9FE]'
                : 'bg-[#E8EAED] text-[#9CA3AF] hover:bg-[#D1D5DB]',
            )}
          >
            <Plus className="size-3 shrink-0" aria-hidden />
            Add Task
          </button>
        </div>
      ) : (
        <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col items-stretch gap-0.5">
          {visible.map((task) => (
            <TaskCalendarTaskChip
              key={`${task.source}-${task.id}-${date}`}
              task={task}
              muted={!inDisplayedMonth}
              onSelect={onOpenTask}
            />
          ))}

          <TaskCalendarOverflow
            remainingCount={overflow}
            tasks={tasks}
            onOpenTask={onOpenTask}
            muted={!inDisplayedMonth}
          />
        </div>
      )}
        </>
      )}
    </div>
  );
}
