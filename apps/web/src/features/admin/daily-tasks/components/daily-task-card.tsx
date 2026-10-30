'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { PointerEvent } from 'react';
import {
  Calendar,
  CalendarClock,
  Eye,
  MoreHorizontal,
  Pencil,
  Trash2,
  UserRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { stopLeadCardPointer } from '@/features/admin/crm/components/lead-contact-quick-actions';
import {
  KANBAN_LEAD_CARD_BORDER_CLASS,
  KANBAN_LEAD_HEADER_HEIGHT_CLASS,
  KanbanLeadHeaderStepBorder,
  KanbanLeadPriorityHeader,
  KanbanLeadPriorityTab,
} from '@/features/admin/crm/components/kanban-lead-priority-badge';
import { EmployeeAvatar } from '@/features/admin/employees/components/employee-avatar';
import { useAdminToast } from '@/features/admin/components/toast';
import { cn } from '@/shared/lib/utils';
import { deleteDailyTask } from '../api/daily-tasks';
import type { DailyTaskListItem } from '../types';

const taskDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

function formatTaskDate(value: string): string {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? '—' : taskDateFormatter.format(date);
}

function formatCategory(category: DailyTaskListItem['category']): string | null {
  if (!category) return null;
  return category.charAt(0) + category.slice(1).toLowerCase().replaceAll('_', ' ');
}

function stopCardPointer(event: PointerEvent) {
  stopLeadCardPointer(event);
}

function TaskTypeHeaderBadge({ type }: { type: DailyTaskListItem['type'] }) {
  return (
    <span
      className={cn(
        'rounded-md border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide shadow-xs',
        type === 'PROJECT'
          ? 'border-violet-200/80 bg-violet-50/90 text-violet-900'
          : 'border-slate-200/80 bg-slate-50/90 text-slate-700',
      )}
    >
      {type === 'PROJECT' ? 'Project' : 'General'}
    </span>
  );
}

function TaskKanbanCardActions({
  taskTitle,
  onView,
  onEdit,
  onReassign,
  onReschedule,
  onDelete,
}: {
  taskTitle: string;
  onView: () => void;
  onEdit: () => void;
  onReassign: () => void;
  onReschedule: () => void;
  onDelete: () => void;
}) {
  return (
    <div onPointerDown={stopCardPointer} onClick={(event) => event.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-foreground size-7 shrink-0 rounded-md hover:bg-black/5"
            aria-label={`Actions for ${taskTitle}`}
            title="Task actions"
          >
            <MoreHorizontal className="size-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[10rem]">
          <DropdownMenuItem onSelect={onView}>
            <Eye className="size-3.5" aria-hidden="true" />
            View Details
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onEdit}>
            <Pencil className="size-3.5" aria-hidden="true" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onReassign}>
            <UserRound className="size-3.5" aria-hidden="true" />
            Reassign
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onReschedule}>
            <CalendarClock className="size-3.5" aria-hidden="true" />
            Reschedule
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={onDelete}>
            <Trash2 className="size-3.5" aria-hidden="true" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function DailyTaskKanbanCardSurface({
  task,
  columnStageName,
  className,
  onOpen,
  onEdit,
  onReschedule,
  onDelete,
}: {
  task: DailyTaskListItem;
  columnStageName?: string;
  className?: string;
  onOpen: () => void;
  onEdit: () => void;
  onReschedule: () => void;
  onDelete: () => void;
}) {
  const primaryAssignee = task.assignees[0];
  const assigneeLabel = primaryAssignee
    ? `${primaryAssignee.displayName}${task.assignees.length > 1 ? ` +${task.assignees.length - 1}` : ''}`
    : 'Unassigned';

  const dateKind = task.dueDate ? 'due' : 'assigned';
  const dateValue = task.dueDate ?? task.assignDate;
  const dateTitle = dateKind === 'due' ? 'Due date' : 'Assigned date';

  const categoryLabel = task.type === 'GENERAL' ? formatCategory(task.category) : null;
  const workflowStatusLabel = task.workflowStageName ?? columnStageName ?? null;

  return (
    <article
      className={cn(
        'group flex flex-col overflow-hidden rounded-tl-[18px] rounded-bl-[18px] rounded-br-[18px] bg-transparent shadow-[0_4px_20px_-10px_rgb(15_23_42_/_0.12)] transition-shadow hover:shadow-[0_8px_24px_-8px_rgb(15_23_42_/_0.16)]',
        KANBAN_LEAD_CARD_BORDER_CLASS,
        className,
      )}
    >
      <div className={cn('relative shrink-0 bg-transparent', KANBAN_LEAD_HEADER_HEIGHT_CLASS)}>
        <KanbanLeadPriorityTab priority={task.priority} />
        <KanbanLeadHeaderStepBorder />
        <div className={cn('relative flex w-full items-stretch', KANBAN_LEAD_HEADER_HEIGHT_CLASS)}>
          <KanbanLeadPriorityHeader priority={task.priority} className="min-w-0 max-w-[58%]" />
          <div className="relative z-[2] min-w-0 flex-1 self-stretch bg-transparent">
            <div className="flex h-full items-center justify-end bg-transparent pr-0.5">
              <TaskKanbanCardActions
                taskTitle={task.title}
                onView={onOpen}
                onEdit={onEdit}
                onReassign={onEdit}
                onReschedule={onReschedule}
                onDelete={onDelete}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card relative z-[1] flex flex-col gap-2.5 rounded-b-[17px] px-3 pt-2 pb-3">
        <div className="flex items-start gap-2">
          <button
            type="button"
            className="min-w-0 flex-1 text-left"
            onClick={onOpen}
            onPointerDown={stopCardPointer}
          >
            <h3 className="text-foreground line-clamp-3 text-[15px] leading-snug font-bold tracking-tight">
              {task.title.trim() || 'Untitled task'}
            </h3>
          </button>
          <div className="shrink-0 pr-0.5 pt-0.5">
            <TaskTypeHeaderBadge type={task.type} />
          </div>
        </div>

        <div className="text-muted-foreground flex min-w-0 flex-col gap-0.5 text-xs leading-snug">
          {task.type === 'PROJECT' ? (
            <>
              {task.projectName ? (
                <span className="text-foreground/90 truncate font-medium">{task.projectName}</span>
              ) : null}
              {task.projectPhaseName ? (
                <span className="truncate text-[11px]">{task.projectPhaseName}</span>
              ) : null}
            </>
          ) : categoryLabel ? (
            <span className="text-[11px]">{categoryLabel}</span>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {primaryAssignee ? (
              <EmployeeAvatar
                displayName={primaryAssignee.displayName}
                profileImageUrl={primaryAssignee.profileImageUrl}
                className="size-7 shrink-0"
              />
            ) : (
              <span
                className="bg-muted text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
                aria-hidden="true"
              >
                —
              </span>
            )}
            <span
              className={cn(
                'truncate text-xs font-medium',
                primaryAssignee ? 'text-muted-foreground' : 'text-muted-foreground/80 italic',
              )}
            >
              {assigneeLabel}
            </span>
          </div>
          <div
            className="text-muted-foreground flex shrink-0 items-center gap-1.5 text-xs"
            title={dateTitle}
          >
            <Calendar className="size-3.5 shrink-0 opacity-70" aria-hidden="true" />
            <time dateTime={dateValue} className="whitespace-nowrap tabular-nums">
              {dateKind === 'due' ? 'Due ' : ''}
              {formatTaskDate(dateValue)}
            </time>
          </div>
        </div>

        <div className="border-border/60 border-t pt-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {workflowStatusLabel ? (
              <span className="border-border bg-muted/40 text-foreground inline-flex max-w-full items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold tracking-tight">
                <span className="truncate">{workflowStatusLabel}</span>
              </span>
            ) : null}
            {task.isOverdue ? (
              <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-800">
                Overdue
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

export function DailyTaskKanbanCard({
  task,
  columnStageName,
  onOpen,
  onEdit,
  onReschedule,
  onChanged,
  dragging = false,
}: {
  task: DailyTaskListItem;
  columnStageName?: string;
  onOpen: (task: DailyTaskListItem) => void;
  onEdit?: (task: DailyTaskListItem) => void;
  onReschedule?: (task: DailyTaskListItem) => void;
  onChanged?: () => void | Promise<void>;
  dragging?: boolean;
}) {
  const toast = useAdminToast();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task, stageId: task.workflowStageId },
  });

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  const onDelete = async () => {
    if (!window.confirm('Delete this task? This cannot be undone.')) return;
    try {
      await deleteDailyTask(task.id);
      toast.success('Task deleted.');
      await onChanged?.();
    } catch {
      toast.error('Could not delete task.');
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn('relative touch-none', (isDragging || dragging) && 'z-20')}
      {...attributes}
      {...listeners}
    >
      <DailyTaskKanbanCardSurface
        task={task}
        columnStageName={columnStageName}
        className={cn(
          'cursor-grab active:cursor-grabbing',
          (isDragging || dragging) && 'opacity-40 shadow-none',
        )}
        onOpen={() => onOpen(task)}
        onEdit={() => (onEdit ?? onOpen)(task)}
        onReschedule={() => (onReschedule ?? onOpen)(task)}
        onDelete={() => void onDelete()}
      />
    </div>
  );
}
