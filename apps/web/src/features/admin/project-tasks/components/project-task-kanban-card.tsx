'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Eye, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import type { PointerEvent } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PriorityBadge } from '@/features/admin/components/priority-badge';
import { formatDateOnly } from '@/features/admin/crm/utils/format';
import { cn } from '@/shared/lib/utils';
import type { ProjectTask } from '../types';
import { labelProjectTaskStatus } from '../utils/labels';
import { localDateOnlyIso } from '../utils/project-timeline-indicator';

function stopCardPointer(event: PointerEvent) {
  event.stopPropagation();
}

function isTaskOverdue(task: ProjectTask): boolean {
  if (!task.dueDate || task.status === 'COMPLETED') return false;
  return task.dueDate < localDateOnlyIso();
}

export function ProjectTaskKanbanCard({
  task,
  className,
  onView,
  onEdit,
  onDelete,
}: {
  task: ProjectTask;
  className?: string;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const overdue = isTaskOverdue(task);

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
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <PriorityBadge priority={task.priority} className="px-1.5 py-0.5 leading-none" />
        <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-medium">
          {labelProjectTaskStatus(task.status)}
        </Badge>
        {overdue ? (
          <Badge variant="outline" className="border-destructive/40 text-destructive h-5 px-1.5 text-[10px]">
            Overdue
          </Badge>
        ) : null}
      </div>
      {task.assignee ? (
        <p className="text-muted-foreground truncate text-xs">{task.assignee.displayName}</p>
      ) : null}
      {(task.startDate || task.dueDate) && (
        <p className="text-muted-foreground text-[10px] tabular-nums">
          {task.startDate ? formatDateOnly(task.startDate) : '—'}
          {' → '}
          {task.dueDate ? formatDateOnly(task.dueDate) : '—'}
        </p>
      )}
      {task.labels.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {task.labels.slice(0, 3).map((label) => (
            <span key={label} className="bg-muted rounded px-1 py-0.5 text-[10px]">
              {label}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}

export function SortableProjectTaskKanbanCard({
  task,
  disabled,
  onView,
  onEdit,
  onDelete,
}: {
  task: ProjectTask;
  disabled?: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
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
        className={cn(
          'cursor-grab active:cursor-grabbing',
          isDragging && 'opacity-40 shadow-none',
          isOver && !isDragging && 'border-primary/35',
        )}
        onView={onView}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  );
}
