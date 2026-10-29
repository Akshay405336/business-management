'use client';

import { Calendar } from 'lucide-react';
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
import {
  KANBAN_LEAD_CARD_BORDER_CLASS,
  KANBAN_LEAD_HEADER_HEIGHT_CLASS,
  KanbanLeadHeaderStepBorder,
  KanbanLeadPriorityHeader,
  KanbanLeadPriorityTab,
} from '@/features/admin/crm/components/kanban-lead-priority-badge';
import type { LeadPriority } from '@/features/admin/crm/types';
import { describeCrmError } from '@/features/admin/crm/utils/errors';
import { formatProjectDateOnly } from '../utils/format-project-date';
import {
  completeProject,
  startProjectProduction,
} from '@/features/admin/projects/api/projects';
import { ProjectNotPlannedSummaryCardBody } from './project-not-planned-summary-card-body';
import { isProjectPlanLocked } from '@/features/admin/projects/constants/plan-lock';
import { ProjectCardActionsMenu } from '@/features/admin/projects/components/project-card-actions-menu';
import type { ProjectActionTarget } from '@/features/admin/projects/hooks/use-project-list-actions';
import { initialsOf } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';
import type { ProjectTaskSummaryItem } from '../types';
import { describeScheduleVarianceDays, projectCompletionVarianceDays } from '../utils/execution-schedule';
import { ProjectPlannedSummaryCardBody } from './project-planned-summary-card-body';
import { ProjectProductionSummaryCardBody } from './project-production-summary-card-body';
import { projectClientAvatarColors } from '../utils/project-task-card-theme';
import {
  getProjectCardTimelineIndicator,
  projectCardTimelineToneClass,
} from '../utils/project-timeline-indicator';

export function ProjectTaskSummaryCard({
  project,
  className,
  actionsDisabled,
  onToggleActive,
  onEdit,
  onDelete,
  onLifecycleChange,
}: {
  project: ProjectTaskSummaryItem;
  className?: string;
  actionsDisabled?: boolean;
  onToggleActive: (project: ProjectActionTarget) => void;
  onEdit: (id: string) => void;
  onDelete: (project: ProjectActionTarget) => void;
  onLifecycleChange?: () => void;
}) {
  const toast = useAdminToast();
  const { pending, run } = useAsyncAction();
  const [startOpen, setStartOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);

  const planHref = `/admin/project-tasks/${project.id}/plan`;
  const boardHref = `/admin/project-tasks/${project.id}`;
  const viewPlanHref = `${boardHref}?viewPlan=1`;
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

  const confirmCompleteProject = async () => {
    try {
      await run(() => completeProject(project.id));
      toast.success('Project marked completed.');
      setCompleteOpen(false);
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

  const priority = project.priority as LeadPriority;
  const clientName = project.clientName.trim() || '—';
  const clientAvatarStyle = projectClientAvatarColors(
    clientName === '—' ? project.name : clientName,
  );

  return (
    <article
      className={cn(
        'group flex h-full min-w-0 flex-col overflow-hidden rounded-tl-[18px] rounded-bl-[18px] rounded-br-[18px] bg-transparent shadow-[0_8px_24px_-8px_rgb(15_23_42_/_0.16)] transition-shadow hover:shadow-[0_12px_32px_-6px_rgb(15_23_42_/_0.22)]',
        KANBAN_LEAD_CARD_BORDER_CLASS,
        className,
      )}
    >
      <div className={cn('relative shrink-0 bg-transparent', KANBAN_LEAD_HEADER_HEIGHT_CLASS)}>
        <KanbanLeadPriorityTab priority={priority} />
        <KanbanLeadHeaderStepBorder />
        <div className={cn('relative flex w-full', KANBAN_LEAD_HEADER_HEIGHT_CLASS)}>
          <KanbanLeadPriorityHeader priority={priority} />
          <div className="relative z-[2] min-w-0 flex-1 self-stretch bg-transparent">
            <div className="flex h-full items-center justify-end bg-transparent pr-0.5">
              <ProjectCardActionsMenu
                project={actionTarget}
                disabled={actionsDisabled || lifecycle === 'COMPLETED'}
                editDisabled={isProjectPlanLocked(lifecycle)}
                onToggleActive={onToggleActive}
                onEdit={onEdit}
                onDelete={onDelete}
                variant="kanban"
              />
            </div>
          </div>
        </div>
      </div>

      <div
        className={cn(
          'bg-card relative z-[1] flex min-h-0 flex-1 flex-col rounded-b-[17px] px-3 pt-2 pb-3',
          lifecycle === 'PLANNED' || lifecycle === 'NOT_PLANNED' ? 'gap-0' : 'gap-2.5',
        )}
      >
        <div
          className={cn(
            'flex min-w-0 flex-col gap-1.5',
            (lifecycle === 'PLANNED' || lifecycle === 'NOT_PLANNED') && 'mb-2',
          )}
        >
          <h3 className="text-foreground line-clamp-2 text-base leading-snug font-bold tracking-tight">
            {project.name}
          </h3>
        </div>

        {lifecycle === 'NOT_PLANNED' ? (
          <ProjectNotPlannedSummaryCardBody
            project={project}
            clientName={clientName}
            clientAvatarStyle={clientAvatarStyle}
            timelineIndicator={timelineIndicator}
            planHref={planHref}
          />
        ) : lifecycle === 'PLANNED' ? (
          <ProjectPlannedSummaryCardBody
            project={project}
            clientName={clientName}
            clientAvatarStyle={clientAvatarStyle}
            timelineIndicator={timelineIndicator}
            planHref={planHref}
            actionsDisabled={actionsDisabled}
            pending={pending}
            onStartProduction={() => setStartOpen(true)}
          />
        ) : lifecycle === 'IN_PRODUCTION' ? (
          <ProjectProductionSummaryCardBody
            project={project}
            clientName={clientName}
            clientAvatarStyle={clientAvatarStyle}
            boardHref={boardHref}
            actionsDisabled={actionsDisabled}
            pending={pending}
            onComplete={() => setCompleteOpen(true)}
          />
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span
                  className="flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
                  style={clientAvatarStyle}
                  aria-hidden="true"
                >
                  {initialsOf(clientName === '—' ? project.name : clientName)}
                </span>
                <span className="text-muted-foreground truncate text-xs font-medium">{clientName}</span>
              </div>
              <div className="text-foreground flex shrink-0 items-center gap-1.5 text-xs font-medium">
                <Calendar className="size-3.5 shrink-0 opacity-90" aria-hidden="true" />
                <span className="whitespace-nowrap tabular-nums">
                  {formatProjectDateOnly(project.startDate)} – {formatProjectDateOnly(project.expectedEndDate)}
                </span>
              </div>
            </div>

            <div className="text-foreground flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              <span className="font-medium">
                {project.phaseCount} {project.phaseCount === 1 ? 'phase' : 'phases'}
              </span>
              <span className="font-medium tabular-nums">
                {project.taskCount} {project.taskCount === 1 ? 'task' : 'tasks'}
              </span>
            </div>

            {timelineIndicator || completionVariance !== null ? (
              <p className="text-foreground m-0 flex min-w-0 flex-wrap items-baseline gap-x-1 gap-y-0 text-xs leading-snug">
                {timelineIndicator ? (
                  <span
                    className={cn('font-medium', projectCardTimelineToneClass[timelineIndicator.tone])}
                  >
                    {timelineIndicator.label}
                  </span>
                ) : null}
                {completionVariance !== null ? (
                  <span className="text-muted-foreground font-normal">
                    {describeScheduleVarianceDays(completionVariance)}
                  </span>
                ) : null}
              </p>
            ) : null}
          </>
        )}

        <div
          className={cn(
            'border-border/60 mt-auto flex min-w-0 flex-col gap-2 border-t pt-2.5',
            (lifecycle === 'PLANNED' ||
              lifecycle === 'NOT_PLANNED' ||
              lifecycle === 'IN_PRODUCTION') &&
              'hidden',
          )}
        >
          {lifecycle === 'COMPLETED' ? (
            <>
              <Button asChild className="h-9 w-full shrink-0">
                <Link href={boardHref}>View Project</Link>
              </Button>
              <Button asChild variant="outline" className="h-9 w-full shrink-0">
                <Link href={viewPlanHref}>View Plan</Link>
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <AlertDialog open={startOpen} onOpenChange={setStartOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start production?</AlertDialogTitle>
            <AlertDialogDescription>
              Start production for “{project.name}”? Planned start date:{' '}
              {formatProjectDateOnly(project.startDate)}. The server will record the actual production
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

      <AlertDialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete project?</AlertDialogTitle>
            <AlertDialogDescription>
              Mark “{project.name}” as completed? This project will become read-only.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmCompleteProject()}>Complete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}
