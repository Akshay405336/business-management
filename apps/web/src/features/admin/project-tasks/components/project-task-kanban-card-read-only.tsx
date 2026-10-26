'use client';

import { Badge } from '@/components/ui/badge';
import { PriorityBadge } from '@/features/admin/components/priority-badge';
import { formatDateOnly } from '@/features/admin/crm/utils/format';
import { cn } from '@/shared/lib/utils';
import type { ProjectTask } from '../types';
import { labelProjectTaskStatus } from '../utils/labels';
import { localDateOnlyIso } from '../utils/project-timeline-indicator';

function isTaskOverdue(task: ProjectTask): boolean {
  if (!task.dueDate || task.status === 'COMPLETED') return false;
  return task.dueDate < localDateOnlyIso();
}

export function ProjectTaskKanbanCardReadOnly({
  task,
  className,
}: {
  task: ProjectTask;
  className?: string;
}) {
  const overdue = isTaskOverdue(task);

  return (
    <article
      className={cn(
        'bg-card flex flex-col gap-1.5 rounded-md border border-black/8 p-2.5 shadow-sm',
        overdue && 'border-destructive/35',
        className,
      )}
    >
      <p className="text-foreground line-clamp-2 text-sm font-medium leading-snug">{task.title}</p>
      {task.description?.trim() ? (
        <p className="text-muted-foreground line-clamp-2 text-xs leading-snug">{task.description}</p>
      ) : null}
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
