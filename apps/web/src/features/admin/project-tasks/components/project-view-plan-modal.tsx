'use client';

import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { CrmErrorAlert } from '@/features/admin/crm/components/crm-feedback';
import { getProject } from '@/features/admin/projects/api/projects';
import type { ProjectDetail } from '@/features/admin/projects/types';
import { PROJECT_VIEW_PLAN_MODAL_CLASS } from '../constants';
import { getProjectTaskBoard } from '../api/project-tasks';
import type { ProjectTaskBoardResponse } from '../types';
import { ProjectTaskKanbanBoard } from './project-task-kanban-board';
import { ProjectWorkspaceSummaryHeader } from './project-workspace-summary-header';

export function ProjectViewPlanModal({
  open,
  onOpenChange,
  projectId,
  project: projectProp,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  project?: ProjectDetail | null;
}) {
  const [planBoard, setPlanBoard] = useState<ProjectTaskBoardResponse | null>(null);
  const [fetchedProject, setFetchedProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const project = projectProp ?? fetchedProject;
  const tasks = useMemo(
    () => planBoard?.phases.flatMap((phase) => phase.tasks) ?? [],
    [planBoard],
  );
  const phases = useMemo(() => planBoard?.phases ?? [], [planBoard]);

  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load frozen plan when modal opens
    setLoading(true);
    setError(null);

    const projectPromise = projectProp
      ? Promise.resolve(projectProp)
      : getProject(projectId, controller.signal);

    void Promise.all([
      getProjectTaskBoard(projectId, { planBaseline: true, signal: controller.signal }),
      projectPromise,
    ])
      .then(([boardData, projectData]) => {
        if (controller.signal.aborted) return;
        setPlanBoard(boardData);
        if (!projectProp) setFetchedProject(projectData);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError('Unable to load the project plan.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [open, projectId, projectProp]);

  useEffect(() => {
    if (open) return;
    setPlanBoard(null);
  }, [open]);

  const ready = Boolean(planBoard && project);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={PROJECT_VIEW_PLAN_MODAL_CLASS}>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {loading && !ready ? (
            <div className="text-muted-foreground flex flex-1 items-center justify-center gap-2 py-16 text-sm">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Loading plan…
            </div>
          ) : error ? (
            <div className="p-4">
              <CrmErrorAlert message={error} />
            </div>
          ) : ready && project && planBoard ? (
            <>
              <ProjectWorkspaceSummaryHeader project={project} titleAs="h2" className="pr-10" />

              <div className="min-h-0 flex-1 overflow-auto px-3 py-3 sm:px-4">
                <ProjectTaskKanbanBoard
                  phases={phases}
                  tasks={tasks}
                  columnVariant="plan"
                  cardVariant="plan"
                  readOnlyView
                  disabled
                  dragDisabled
                  onPersistMove={async () => {}}
                  onView={() => {}}
                  onEdit={() => {}}
                  onDelete={() => {}}
                  onAddInPhase={() => {}}
                />
              </div>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
