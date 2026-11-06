'use client';

import type { TaskCalendarTaskDto } from '@techwin/contracts';
import { useRef, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/shared/lib/utils';
import { formatDisplayDate } from '@/features/admin/daily-tasks/utils/local-date';
import { formatTaskCalendarStatusLine, formatTaskCalendarTaskType, taskCalendarChipStyle } from '../utils/calendar-task.utils';

/** +N more — hover (desktop) or click/tap opens full list in a portaled popover (no cell clipping). */
export function TaskCalendarOverflow({
  remainingCount,
  tasks,
  onOpenTask,
  className,
  muted = false,
}: {
  remainingCount: number;
  tasks: readonly TaskCalendarTaskDto[];
  onOpenTask: (task: TaskCalendarTaskDto) => void;
  className?: string;
  /** Adjacent-month: subdued "+N more" trigger. */
  muted?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const hoverCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (remainingCount <= 0) return null;

  const clearHoverClose = () => {
    if (hoverCloseTimer.current) {
      clearTimeout(hoverCloseTimer.current);
      hoverCloseTimer.current = null;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen((v) => !v);
          }}
          onMouseEnter={() => {
            clearHoverClose();
            setOpen(true);
          }}
          onMouseLeave={() => {
            clearHoverClose();
            hoverCloseTimer.current = setTimeout(() => setOpen(false), 120);
          }}
          className={cn(
            // Button resets only — typography lives on inner span (see below).
            'inline-flex w-full min-w-0 cursor-pointer items-center border-0 bg-transparent p-0 text-left shadow-none outline-none ring-0 focus-visible:border-0 focus-visible:shadow-none focus-visible:outline-none focus-visible:ring-0',
            className,
          )}
        >
          {/*
            Root cause: body uses text-sm; buttons inherit. More importantly, OS/browsers often enforce a
            minimum font size, so tiny text-* utilities can clamp to ~12px — same as task chips that also
            use small px values. Use an explicit base size + scale so the label stays visibly secondary.
          */}
          <span
            className={cn(
              'inline-block min-w-0 max-w-full origin-left scale-[0.72] truncate text-[10px] font-normal leading-tight [-webkit-text-size-adjust:none] [text-size-adjust:none] sm:scale-[0.78] sm:text-[11px]',
              muted
                ? 'text-[#9CA3AF] hover:text-[#6B7280]'
                : 'text-purple-950 hover:text-purple-900',
            )}
          >
            +{remainingCount} more
          </span>
        </button>
      </PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={6}
        className="z-[100] w-[min(calc(100vw-1.5rem),20rem)] max-h-[min(70vh,22rem)] overflow-y-auto overflow-x-hidden p-2"
        onClick={(e) => e.stopPropagation()}
        onMouseEnter={() => {
          clearHoverClose();
          setOpen(true);
        }}
        onMouseLeave={() => {
          clearHoverClose();
          hoverCloseTimer.current = setTimeout(() => setOpen(false), 120);
        }}
      >
        <ul className="flex flex-col gap-1.5">
          {tasks.map((task) => {
            const { surfaceHex, dotHex, text } = taskCalendarChipStyle(task);
            const typeLabel = formatTaskCalendarTaskType(task.taskType);

            const due =
              typeof task.dueDate === 'string' && task.dueDate !== ''
                ? `Due ${formatDisplayDate(task.dueDate)}`
                : null;

            return (
              <li key={`${task.source}-${task.id}-overflow`}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenTask(task);
                  }}
                  style={{ backgroundColor: surfaceHex }}
                  className="flex w-full min-w-0 flex-col gap-0.5 rounded-md border border-transparent px-2 py-1.5 text-left text-[11px] leading-snug shadow-xs transition-opacity hover:opacity-95"
                >
                  <span className="flex min-w-0 items-start gap-2">
                    <span
                      className="mt-1 size-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: dotHex }}
                      aria-hidden
                    />
                    <span className={cn('min-w-0 flex-1 font-medium', text)}>{task.title}</span>
                  </span>

                  <span className="text-[10px] opacity-90">{formatTaskCalendarStatusLine(task)}</span>

                  <span className="text-muted-foreground text-[10px]">{typeLabel}</span>

                  {due ? (
                    <span className="text-muted-foreground text-[10px]">{due}</span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
