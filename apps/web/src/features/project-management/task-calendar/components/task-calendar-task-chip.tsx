'use client';

import type { TaskCalendarTaskDto } from '@techwin/contracts';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/shared/lib/utils';
import { formatTaskCalendarStatusLine, taskCalendarChipStyle } from '../utils/calendar-task.utils';

const MUTED_CHIP_STYLE = {
  surfaceHex: '#E8EAED',
  dotHex: '#9CA3AF',
  text: 'text-[#9CA3AF]',
} as const;

export function TaskCalendarTaskChip({
  task,
  className,
  muted = false,
  onSelect,
}: {
  task: TaskCalendarTaskDto;
  className?: string;
  /** Adjacent-month cells: grey chip (no status colors). */
  muted?: boolean;
  onSelect: (task: TaskCalendarTaskDto) => void;
}) {
  const { surfaceHex, dotHex, text } = muted ? MUTED_CHIP_STYLE : taskCalendarChipStyle(task);
  const statusLine = formatTaskCalendarStatusLine(task);
  const tooltip = [task.title, statusLine, task.dueDate ? `Due ${task.dueDate}` : null].filter(Boolean).join('\n');

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(task);
          }}
          style={{ backgroundColor: surfaceHex }}
          className={cn(
            'flex min-h-[20px] w-full min-w-0 items-center gap-1 rounded-md border border-transparent px-1 py-0.5 text-left text-[9px] leading-snug shadow-xs transition-opacity hover:opacity-95 sm:min-h-[21px] sm:text-[10px]',
            muted && 'opacity-90 hover:opacity-100',
            className,
          )}
        >
          <span
            className="size-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: dotHex }}
            aria-hidden
          />
          <span className={cn('min-w-0 flex-1 truncate font-medium', text)}>{task.title}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" align="start" className="max-w-[18rem] whitespace-pre-line text-xs">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}
