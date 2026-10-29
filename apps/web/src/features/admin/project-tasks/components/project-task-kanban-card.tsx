'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Calendar,
  CalendarClock,
  ChevronDown,
  Play,
  Eye,
  MoreHorizontal,
  MoreVertical,
  Pencil,
  Trash2,
} from 'lucide-react';
import type { CSSProperties, PointerEvent } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  KANBAN_LEAD_CARD_BORDER_CLASS,
  KANBAN_LEAD_HEADER_HEIGHT_CLASS,
  KanbanLeadHeaderStepBorder,
  KanbanLeadPriorityHeader,
  KanbanLeadPriorityTab,
} from '@/features/admin/crm/components/kanban-lead-priority-badge';
import { PriorityBadge } from '@/features/admin/components/priority-badge';
import { formatProjectDateOnly } from '../utils/format-project-date';
import {
  formatPipelineTaskPlannedRange,
  formatPipelineTaskStartedRange,
} from '../utils/task-actual-date-display';
import type { LeadPriority } from '@/features/admin/crm/types';
import { initialsOf } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';
import { isTaskDateOutsidePhase, type TaskPhaseDateBounds } from '@techwin/validation';
import type { ProjectTask, ProjectTaskPriority, ProjectTaskStatus } from '../types';
import { labelProjectTaskStatus } from '../utils/labels';
import { localDateOnlyIso } from '../utils/project-timeline-indicator';
import { projectTaskCardBackground, projectTaskCardTheme } from '../utils/project-task-card-theme';

function stopCardPointer(event: PointerEvent) {
  event.stopPropagation();
}

function isTaskOverdue(task: ProjectTask): boolean {
  if (!task.dueDate || task.status === 'COMPLETED') return false;
  return task.dueDate < localDateOnlyIso();
}

const PLAN_PRIORITY_PILL: Record<
  ProjectTaskPriority,
  { background: string; color: string }
> = {
  LOW: {
    background: 'linear-gradient(180deg, #d1fae5 0%, #f0fdf4 100%)',
    color: '#15803d',
  },
  MEDIUM: {
    background: 'linear-gradient(180deg, #fef08a 0%, #fefce8 100%)',
    color: '#a16207',
  },
  HIGH: {
    background: 'linear-gradient(180deg, #fed7aa 0%, #fff7ed 100%)',
    color: '#c2410c',
  },
  URGENT: {
    background: 'linear-gradient(180deg, #fecdd3 0%, #fff1f2 100%)',
    color: '#b91c1c',
  },
};

const PIPELINE_TASK_STATUSES: readonly ProjectTaskStatus[] = [
  'TODO',
  'IN_PROGRESS',
  'IN_REVIEW',
  'COMPLETED',
];

function pipelineTaskStatusLabel(status: ProjectTaskStatus): string {
  if (status === 'IN_REVIEW') return 'Review';
  return labelProjectTaskStatus(status);
}

const PIPELINE_TASK_STATUS_DOT_CLASS: Record<ProjectTaskStatus, string> = {
  TODO: 'bg-neutral-400',
  IN_PROGRESS: 'bg-sky-500',
  IN_REVIEW: 'bg-amber-600',
  COMPLETED: 'bg-emerald-500',
};

function PipelineTaskStatusDot({
  status,
  className,
}: {
  status: ProjectTaskStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'size-2 shrink-0 rounded-full',
        PIPELINE_TASK_STATUS_DOT_CLASS[status],
        className,
      )}
      aria-hidden="true"
    />
  );
}

function PipelineTaskStatusButton({
  status,
  disabled,
  onStatusChange,
}: {
  status: ProjectTaskStatus;
  disabled?: boolean;
  onStatusChange: (status: ProjectTaskStatus) => void;
}) {
  return (
    <div onPointerDown={stopCardPointer} onClick={(event) => event.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            className="border-border/80 h-7 shrink-0 gap-1 rounded-md px-2 text-[11px] font-medium shadow-none"
            aria-label="Task status"
          >
            <PipelineTaskStatusDot status={status} />
            {pipelineTaskStatusLabel(status)}
            <ChevronDown className="size-3 opacity-70" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[9.5rem]">
          <DropdownMenuRadioGroup
            value={status}
            onValueChange={(value) => {
              if (!value || value === status) return;
              onStatusChange(value as ProjectTaskStatus);
            }}
          >
            {PIPELINE_TASK_STATUSES.map((option) => (
              <DropdownMenuRadioItem key={option} value={option} className="gap-2">
                <PipelineTaskStatusDot status={option} />
                {pipelineTaskStatusLabel(option)}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function TaskCardActionsMenu({
  onView,
  onEdit,
  onDelete,
  hideEdit,
  triggerClassName,
  iconSize = 'size-4',
}: {
  onView: () => void;
  onEdit?: () => void;
  onDelete: () => void;
  hideEdit?: boolean;
  triggerClassName?: string;
  iconSize?: string;
}) {
  return (
    <div
      className="relative z-[2] flex shrink-0 items-center pr-1.5"
      onPointerDown={stopCardPointer}
      onClick={(event) => event.stopPropagation()}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className={cn(
              'text-muted-foreground hover:text-foreground size-7 rounded-md hover:bg-black/5',
              triggerClassName,
            )}
            aria-label="Task actions"
          >
            <MoreHorizontal className={iconSize} aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[9rem]">
          <DropdownMenuItem onSelect={onView}>
            <Eye className="size-3.5" aria-hidden="true" />
            View
          </DropdownMenuItem>
          {hideEdit ? null : (
            <DropdownMenuItem onSelect={onEdit}>
              <Pencil className="size-3.5" aria-hidden="true" />
              Edit
            </DropdownMenuItem>
          )}
          <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={onDelete}>
            <Trash2 className="size-3.5" aria-hidden="true" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function ProjectTaskKanbanCard({
  task,
  variant = 'default',
  phaseBounds,
  className,
  onView,
  onEdit,
  onDelete,
  hideCardMenu,
  onStatusChange,
  statusControlDisabled,
}: {
  task: ProjectTask;
  variant?: 'default' | 'plan' | 'pipeline';
  /** When set (plan board), dates outside the phase window are highlighted. */
  phaseBounds?: TaskPhaseDateBounds;
  className?: string;
  hideCardMenu?: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange?: (status: ProjectTaskStatus) => void;
  statusControlDisabled?: boolean;
}) {
  const overdue = isTaskOverdue(task);
  const priority = task.priority as LeadPriority;

  if (variant === 'plan') {
    const theme = projectTaskCardTheme(task.id);
    const labels = task.labels.length > 0 ? task.labels : [];
    const hasDates = Boolean(task.startDate || task.dueDate);
    const datesOutsidePhase =
      phaseBounds &&
      isTaskDateOutsidePhase(
        { startDate: task.startDate, dueDate: task.dueDate },
        phaseBounds,
      );

    const cardBackground = projectTaskCardBackground(task.id);
    return (
      <article
        className={cn(
          'group flex flex-col gap-3 rounded-2xl p-3',
          'shadow-[0_2px_10px_rgb(15_23_42_/_0.1)]',
          'transition-[box-shadow] duration-200 ease-out',
          'hover:shadow-[0_3px_14px_rgb(15_23_42_/_0.11),0_0_18px_color-mix(in_srgb,var(--plan-card-glow)_12%,transparent)]',
          overdue && 'ring-2 ring-red-400/50 ring-offset-1',
          className,
        )}
        style={
          {
            background: cardBackground,
            '--plan-card-glow': theme.accent,
          } as CSSProperties
        }
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
            {labels.length > 0 ? (
              labels.map((label) => (
                <span
                  key={label}
                  className="inline-flex max-w-full truncate rounded-full px-2 py-0.5 text-[11px] font-semibold"
                  style={{ color: theme.accent, backgroundColor: theme.chip }}
                >
                  #{label}
                </span>
              ))
            ) : (
              <span
                className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium"
                style={{ color: theme.ink, backgroundColor: theme.chip }}
              >
                Task
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <span
              className="shrink-0 rounded-full px-2 py-1 text-[9px] font-semibold uppercase tracking-wide"
              style={PLAN_PRIORITY_PILL[priority as ProjectTaskPriority]}
            >
              {priority}
            </span>
            <TaskCardActionsMenu
              onView={onView}
              onEdit={onEdit}
              onDelete={onDelete}
              triggerClassName="rounded-lg bg-transparent text-foreground shadow-none hover:bg-white/30"
              iconSize="size-4"
            />
          </div>
        </div>

        <h3
          className="line-clamp-2 text-base font-bold leading-snug tracking-tight"
          style={{ color: theme.ink }}
        >
          {task.title}
        </h3>

        {task.description?.trim() ? (
          <p
            className="line-clamp-3 max-w-[70%] text-xs font-normal leading-snug"
            style={{ color: theme.ink, opacity: 0.82 }}
            title={task.description.trim()}
          >
            {task.description.trim()}
          </p>
        ) : null}

        {hasDates ? (
          <p
            className={cn(
              'flex min-w-0 items-center gap-1.5 text-xs font-normal tabular-nums',
              datesOutsidePhase && 'rounded-md bg-amber-500/15 px-1 py-0.5',
            )}
            style={{ color: datesOutsidePhase ? '#b45309' : theme.ink }}
            title={
              datesOutsidePhase && phaseBounds
                ? `Outside phase (${formatProjectDateOnly(phaseBounds.phaseStartDate)} – ${formatProjectDateOnly(phaseBounds.phaseExpectedEndDate)}). Edit task dates.`
                : undefined
            }
          >
            <CalendarClock className="size-3.5 shrink-0 opacity-90" aria-hidden="true" />
            <span className="truncate">
              {task.startDate && task.dueDate
                ? `${formatProjectDateOnly(task.startDate)} – ${formatProjectDateOnly(task.dueDate)}`
                : task.startDate
                  ? formatProjectDateOnly(task.startDate)
                  : task.dueDate
                    ? formatProjectDateOnly(task.dueDate)
                    : null}
            </span>
          </p>
        ) : null}

        {task.assignee ? (
          <div className="mt-auto flex items-center pt-0.5">
            <span
              className="inline-flex size-8 items-center justify-center rounded-full text-[11px] font-bold text-white"
              style={{ backgroundColor: theme.accent }}
              title={task.assignee.displayName}
            >
              {initialsOf(task.assignee.displayName)}
            </span>
          </div>
        ) : null}
      </article>
    );
  }

  if (variant === 'pipeline') {
    return (
      <article
        className={cn(
          'group flex flex-col overflow-hidden rounded-tl-[18px] rounded-bl-[18px] rounded-br-[18px] bg-transparent shadow-[0_4px_20px_-10px_rgb(15_23_42_/_0.12)] transition-shadow hover:shadow-[0_8px_24px_-8px_rgb(15_23_42_/_0.16)]',
          KANBAN_LEAD_CARD_BORDER_CLASS,
          overdue && 'ring-2 ring-red-400/40 ring-offset-1',
          className,
        )}
      >
        <div className={cn('relative shrink-0 bg-transparent', KANBAN_LEAD_HEADER_HEIGHT_CLASS)}>
          {!hideCardMenu ? (
            <>
              <KanbanLeadPriorityTab priority={priority} />
              <KanbanLeadHeaderStepBorder />
              <div className={cn('relative flex w-full', KANBAN_LEAD_HEADER_HEIGHT_CLASS)}>
                <KanbanLeadPriorityHeader priority={priority} />
                <div className="relative z-[2] min-w-0 flex-1 self-stretch bg-transparent">
                  <div className="flex h-full items-center justify-end bg-transparent pr-0.5">
                    <TaskCardActionsMenu
                      onView={onView}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      hideEdit={variant === 'pipeline'}
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className={cn('relative flex w-full', KANBAN_LEAD_HEADER_HEIGHT_CLASS)}>
              <KanbanLeadPriorityHeader priority={priority} />
            </div>
          )}
        </div>

        <div className="bg-card relative z-[1] flex min-h-[7.5rem] flex-col gap-2 rounded-b-[17px] px-3 pt-2 pb-3">
          <div className="flex items-start gap-2">
            <h3 className="text-foreground min-w-0 flex-1 line-clamp-2 text-[15px] leading-snug font-bold tracking-tight">
              {task.title}
            </h3>
            {onStatusChange ? (
              <PipelineTaskStatusButton
                status={task.status}
                disabled={statusControlDisabled}
                onStatusChange={onStatusChange}
              />
            ) : null}
          </div>
          {task.description?.trim() ? (
            <p className="text-muted-foreground line-clamp-2 text-xs leading-snug">{task.description.trim()}</p>
          ) : null}

          <div className="mt-auto space-y-1.5 pt-1">
            {task.assignee ? (
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="bg-muted text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
                  aria-hidden="true"
                >
                  {initialsOf(task.assignee.displayName)}
                </span>
                <span className="text-muted-foreground truncate text-xs font-medium">
                  {task.assignee.displayName}
                </span>
              </div>
            ) : null}

            <div className="text-muted-foreground space-y-1 text-xs leading-snug tabular-nums">
              <div className="flex min-w-0 items-start gap-1.5">
                <Calendar className="mt-0.5 size-3.5 shrink-0 opacity-70" aria-hidden="true" />
                <span className="min-w-0 break-words">
                  <span className="text-foreground/70 font-medium">Planned:</span>{' '}
                  {formatPipelineTaskPlannedRange(task)}
                </span>
              </div>
              <div className="flex min-w-0 items-start gap-1.5">
                <Play
                  className="mt-0.5 size-3.5 shrink-0 fill-emerald-600 text-emerald-600"
                  aria-hidden="true"
                />
                <span className="min-w-0 break-words">
                  <span className="text-foreground/70 font-medium">Started:</span>{' '}
                  {formatPipelineTaskStartedRange(task)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      className={cn(
        'group bg-card flex flex-col gap-1.5 rounded-md border border-black/8 p-2.5 shadow-sm transition-shadow hover:border-border/80 hover:shadow-md',
        overdue && 'border-destructive/35',
        className,
      )}
    >
      <div className="flex items-start gap-1">
        <div className="min-w-0 flex-1">
          <p className="text-foreground line-clamp-2 text-sm font-medium leading-snug">{task.title}</p>
          {task.description?.trim() ? (
            <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs leading-snug">{task.description}</p>
          ) : null}
        </div>
        <div
          className="flex shrink-0 items-center gap-0"
          onPointerDown={stopCardPointer}
          onClick={(event) => event.stopPropagation()}
        >
          {hideCardMenu ? null : (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-6"
                aria-label={`View ${task.title}`}
                onClick={onView}
              >
                <Eye className="size-3.5" aria-hidden="true" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="size-6"
                    aria-label="Task actions"
                  >
                    <MoreVertical className="size-3.5" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[8rem]">
                  <DropdownMenuItem onSelect={onEdit}>
                    <Pencil className="size-3.5" aria-hidden="true" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={onDelete}>
                    <Trash2 className="size-3.5" aria-hidden="true" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <PriorityBadge priority={priority} className="px-1.5 py-0.5 leading-none" />
      </div>
      {task.assignee ? (
        <p className="text-muted-foreground truncate text-xs">{task.assignee.displayName}</p>
      ) : null}
      {(task.startDate || task.dueDate) && (
        <p className="text-muted-foreground text-[10px] tabular-nums">
          {task.startDate ? formatProjectDateOnly(task.startDate) : '—'}
          {' → '}
          {task.dueDate ? formatProjectDateOnly(task.dueDate) : '—'}
        </p>
      )}
    </article>
  );
}

export function SortableProjectTaskKanbanCard({
  task,
  variant = 'default',
  phaseBounds,
  disabled,
  onView,
  onEdit,
  onDelete,
  hideCardMenu,
  onStatusChange,
  statusControlDisabled,
}: {
  task: ProjectTask;
  variant?: 'default' | 'plan' | 'pipeline';
  phaseBounds?: TaskPhaseDateBounds;
  disabled?: boolean;
  hideCardMenu?: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange?: (status: ProjectTaskStatus) => void;
  statusControlDisabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({
    id: task.id,
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn('relative touch-none', isDragging && 'z-20')}
      {...attributes}
      {...listeners}
    >
      {isOver && !isDragging ? (
        <div
          className="bg-primary/70 pointer-events-none absolute -top-1 right-0 left-0 z-10 h-0.5 rounded-full"
          aria-hidden="true"
        />
      ) : null}
      <ProjectTaskKanbanCard
        task={task}
        variant={variant}
        phaseBounds={phaseBounds}
        hideCardMenu={hideCardMenu}
        className={hideCardMenu ? undefined : 'cursor-grab active:cursor-grabbing'}
        onView={onView}
        onEdit={onEdit}
        onDelete={onDelete}
        onStatusChange={onStatusChange}
        statusControlDisabled={statusControlDisabled}
      />
    </div>
  );
}
