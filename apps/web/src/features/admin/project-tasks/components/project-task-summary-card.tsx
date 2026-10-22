'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ProjectCardActionsMenu } from '@/features/admin/projects/components/project-card-actions-menu';
import type { ProjectActionTarget } from '@/features/admin/projects/hooks/use-project-list-actions';
import { ProjectPriorityBadge } from '@/features/admin/projects/components/project-priority-badge';
import { ProjectProgressBar } from '@/features/admin/projects/components/project-progress-bar';
import { ProjectStatusBadge } from '@/features/admin/projects/components/project-status-badge';
import { formatDateOnly } from '@/features/admin/crm/utils/format';
import type { ProjectTaskSummaryItem } from '../types';
import { ProjectTimelineBadge } from './project-timeline-badge';

export function ProjectTaskSummaryCard({
  project,
  actionsDisabled,
  onToggleActive,
  onEdit,
  onDelete,
}: {
  project: ProjectTaskSummaryItem;
  actionsDisabled?: boolean;
  onToggleActive: (project: ProjectActionTarget) => void;
  onEdit: (id: string) => void;
  onDelete: (project: ProjectActionTarget) => void;
}) {
  const href = `/admin/project-tasks/${project.id}`;
  const actionTarget: ProjectActionTarget = {
    id: project.id,
    name: project.name,
    projectNumber: project.projectNumber,
    status: project.status,
  };

  return (
    <article className="bg-card flex h-full min-w-0 flex-col gap-3 rounded-lg border p-4 shadow-xs transition-shadow hover:shadow-sm">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <p className="text-muted-foreground min-w-0 flex-1 truncate text-xs font-medium tabular-nums">
          {project.projectNumber}
        </p>
        <div className="flex shrink-0 items-center gap-1.5">
          <ProjectStatusBadge status={project.status} />
          <ProjectPriorityBadge priority={project.priority} />
          <ProjectCardActionsMenu
            project={actionTarget}
            disabled={actionsDisabled}
            onToggleActive={onToggleActive}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </div>
      </div>
      <h3 className="min-w-0 truncate text-base font-semibold leading-snug">{project.name}</h3>
      <p className="text-muted-foreground min-w-0 truncate text-sm">{project.clientName}</p>
      <div className="text-foreground flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <span className="font-medium">
          {project.phaseCount} {project.phaseCount === 1 ? 'phase' : 'phases'}
        </span>
        <span className="font-medium tabular-nums">
          {project.completedTaskCount}/{project.taskCount} tasks done
        </span>
      </div>
      <div className="min-w-0 w-full">
        <ProjectProgressBar percent={project.progressPercent} />
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
        <p className="text-foreground text-xs font-medium tabular-nums">
          {formatDateOnly(project.startDate)} – {formatDateOnly(project.expectedEndDate)}
        </p>
        <ProjectTimelineBadge project={project} />
      </div>
      <Button asChild className="mt-auto h-9 w-full shrink-0">
        <Link href={href}>Open Project Board</Link>
      </Button>
    </article>
  );
}
