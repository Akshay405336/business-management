'use client';

import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CrmErrorAlert } from '@/features/admin/crm/components/crm-feedback';
import { formatProjectDateOnly } from '../utils/format-project-date';
import { ProjectExecutionLifecycleBadge } from '@/features/admin/projects/components/project-execution-lifecycle-badge';
import { ProjectPlanLockNotice } from '@/features/admin/projects/components/project-plan-lock-notice';
import { ProjectPriorityBadge } from '@/features/admin/projects/components/project-priority-badge';
import { isProjectPlanLocked } from '@/features/admin/projects/constants/plan-lock';
import { PROJECT_VIEW_PLAN_MODAL_CLASS } from '../constants';
import { getProjectTaskBoard } from '../api/project-tasks';
import type { ProjectTaskBoardResponse } from '../types';
import { ProjectPlanReadOnlyBoard } from './project-plan-read-only-board';

export function ProjectViewPlanModal({
  open,
  onOpenChange,
  projectId,
  board: boardProp,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  /** When provided, the modal reuses this data and does not refetch. */
  board?: ProjectTaskBoardResponse | null;
}) {
  const [fetchedBoard, setFetchedBoard] = useState<ProjectTaskBoardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const board = boardProp ?? fetchedBoard;

  useEffect(() => {
    if (!open || boardProp) return;

    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load plan when modal opens
    setLoading(true);
    setError(null);
    void getProjectTaskBoard(projectId, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setFetchedBoard(data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError('Unable to load the project plan.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [open, projectId, boardProp]);

  const tasks = useMemo(
    () => board?.phases.flatMap((phase) => phase.tasks) ?? [],
    [board],
  );

  const project = board?.project;
  const planLocked = project ? isProjectPlanLocked(project.executionLifecycle) : false;
  const progress = project ? Math.min(100, Math.max(0, project.progressPercent)) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={PROJECT_VIEW_PLAN_MODAL_CLASS}>
        <DialogHeader className="shrink-0 space-y-0 border-b bg-white px-4 py-3 sm:px-5">
          <div className="flex min-w-0 flex-wrap items-start justify-between gap-2 pr-8">
            <div className="min-w-0 flex-1 space-y-1">
              <DialogTitle className="text-base leading-snug sm:text-lg">
                {project ? (
                  <>
                    <span className="text-muted-foreground block text-xs font-medium tabular-nums">
                      {project.projectNumber}
                    </span>
                    <span className="block truncate">{project.name}</span>
                  </>
                ) : (
                  'Project plan'
                )}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                {project ? (
                  <>
                    {project.clientName}
                    {project.companyName?.trim() ? ` · ${project.companyName}` : ''}
                  </>
                ) : (
                  'Loading plan…'
                )}
              </DialogDescription>
            </div>
            {project ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <ProjectExecutionLifecycleBadge lifecycle={project.executionLifecycle} />
                <ProjectPriorityBadge priority={project.priority} />
              </div>
            ) : null}
          </div>
          {project ? (
            <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <span className="text-foreground font-medium tabular-nums">
                Planned: {formatProjectDateOnly(project.startDate)} –{' '}
                {formatProjectDateOnly(project.expectedEndDate)}
              </span>
              <span className="text-foreground font-medium tabular-nums">{progress}% complete</span>
              <div
                className="bg-muted h-1.5 w-24 min-w-[5rem] overflow-hidden rounded-full"
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Overall progress ${progress} percent`}
              >
                <div
                  className="bg-primary h-full rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : null}
          {planLocked ? <ProjectPlanLockNotice compact className="mt-2" /> : null}
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-auto bg-white px-3 py-3 sm:px-4">
          {loading && !board ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-16 text-sm">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Loading plan…
            </div>
          ) : error ? (
            <CrmErrorAlert message={error} />
          ) : board ? (
            <ProjectPlanReadOnlyBoard phases={board.phases} tasks={tasks} />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
