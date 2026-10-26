'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useAdminToast } from '@/features/admin/components/toast';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';
import { describeCrmError } from '@/features/admin/crm/utils/errors';
import { formatDateOnly } from '@/features/admin/crm/utils/format';
import { startProjectProduction } from '@/features/admin/projects/api/projects';
import { ProjectCardActionsMenu } from '@/features/admin/projects/components/project-card-actions-menu';
import type { ProjectActionTarget } from '@/features/admin/projects/hooks/use-project-list-actions';
import { ProjectPriorityBadge } from '@/features/admin/projects/components/project-priority-badge';
import { ProjectProgressBar } from '@/features/admin/projects/components/project-progress-bar';
import { cn } from '@/shared/lib/utils';
import type { ProjectTaskSummaryItem } from '../types';
import { describeScheduleVarianceDays, projectCompletionVarianceDays } from '../utils/execution-schedule';
import {
  getProjectCardTimelineIndicator,
  projectCardTimelineToneClass,
} from '../utils/project-timeline-indicator';

export function ProjectTaskSummaryCard({
  project,
  actionsDisabled,
  onToggleActive,
  onEdit,
  onDelete,
  onLifecycleChange,
}: {
  project: ProjectTaskSummaryItem;
  actionsDisabled?: boolean;
  onToggleActive: (project: ProjectActionTarget) => void;
  onEdit: (id: string) => void;
  onDelete: (project: ProjectActionTarget) => void;
  onLifecycleChange?: () => void;
}) {
  const toast = useAdminToast();
  const { pending, run } = useAsyncAction();
  const [startOpen, setStartOpen] = useState(false);

  const planHref = `/admin/project-tasks/${project.id}/plan`;
  const boardHref = `/admin/project-tasks/${project.id}`;
  const actionTarget: ProjectActionTarget = {
    id: project.id,
    name: project.name,
    projectNumber: project.projectNumber,
    status: project.status,
  };

  const confirmStartProduction = async () => {
    try {
      await run(() => startProjectProduction(project.id));
      toast.success('Production started.');
      setStartOpen(false);
      onLifecycleChange?.();
    } catch (failure) {
      toast.error(describeCrmError(failure));
    }
  };

  const lifecycle = project.executionLifecycle;
  const timelineIndicator = getProjectCardTimelineIndicator({
    executionLifecycle: lifecycle,
    startDate: project.startDate,
    actualProductionStartedAt: project.actualProductionStartedAt,
    actualCompletedAt: project.actualCompletedAt,
  });

  const completionVariance =
    project.actualCompletedAt && lifecycle === 'COMPLETED'
      ? projectCompletionVarianceDays(project.expectedEndDate, project.actualCompletedAt)
      : null;

  return (
    <article className="bg-card flex h-full min-w-0 flex-col gap-3 rounded-lg border p-4 shadow-xs transition-shadow hover:shadow-sm">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <p className="text-muted-foreground min-w-0 flex-1 truncate text-xs font-medium tabular-nums">
          {project.projectNumber}
        </p>
        <div className="flex shrink-0 items-center gap-1.5">
          <ProjectPriorityBadge priority={project.priority} />
          <ProjectCardActionsMenu
            project={actionTarget}
            disabled={actionsDisabled || lifecycle === 'COMPLETED'}
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
      <div className="min-w-0">
        <p className="text-foreground m-0 flex min-w-0 flex-wrap items-baseline gap-x-1 gap-y-0 text-xs tabular-nums leading-none">
          <span className="font-medium">
            {formatDateOnly(project.startDate)} – {formatDateOnly(project.expectedEndDate)}
          </span>
          {timelineIndicator ? (
            <>
              <span className="text-muted-foreground font-normal" aria-hidden="true">
                ·
              </span>
              <span
                className={cn(
                  'text-xs font-normal leading-none',
                  projectCardTimelineToneClass[timelineIndicator.tone],
                )}
              >
                {timelineIndicator.label}
              </span>
            </>
          ) : null}
        </p>
        {completionVariance !== null ? (
          <p className="text-muted-foreground m-0 mt-0.5 text-xs font-normal leading-none">
            {describeScheduleVarianceDays(completionVariance)}
          </p>
        ) : null}
      </div>
      <div className="mt-auto flex min-w-0 flex-col gap-2">
        {lifecycle === 'NOT_PLANNED' ? (
          <Button asChild className="h-9 w-full shrink-0">
            <Link href={planHref}>Create Plan</Link>
          </Button>
        ) : null}
        {lifecycle === 'PLANNED' ? (
          <>
            <Button asChild variant="default" className="h-9 w-full shrink-0">
              <Link href={planHref}>View Plan</Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-9 w-full shrink-0"
              disabled={actionsDisabled || pending}
              onClick={() => setStartOpen(true)}
            >
              Start Production
            </Button>
          </>
        ) : null}
        {lifecycle === 'IN_PRODUCTION' ? (
          <>
            <Button asChild className="h-9 w-full shrink-0">
              <Link href={boardHref}>Open Production Board</Link>
            </Button>
            <Button asChild variant="outline" className="h-9 w-full shrink-0">
              <Link href={planHref}>View Plan</Link>
            </Button>
          </>
        ) : null}
        {lifecycle === 'COMPLETED' ? (
          <>
            <Button asChild className="h-9 w-full shrink-0">
              <Link href={boardHref}>View Project</Link>
            </Button>
            <Button asChild variant="outline" className="h-9 w-full shrink-0">
              <Link href={planHref}>View Plan</Link>
            </Button>
          </>
        ) : null}
      </div>
      <AlertDialog open={startOpen} onOpenChange={setStartOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start production?</AlertDialogTitle>
            <AlertDialogDescription>
              Start production for “{project.name}”? Planned start date:{' '}
              {formatDateOnly(project.startDate)}. The server will record the actual production
              start time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmStartProduction()}>
              Start Production
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}
