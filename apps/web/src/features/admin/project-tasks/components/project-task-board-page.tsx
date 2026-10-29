'use client';

import { FileText } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { CrmErrorAlert, CrmLoadingRows } from '@/features/admin/crm/components/crm-feedback';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';
import { describeCrmError } from '@/features/admin/crm/utils/errors';
import {
  changeProjectStatus,
  completeProject,
  deleteProject as deleteProjectApi,
  getProject,
} from '@/features/admin/projects/api/projects';
import { ProjectDeleteDialog } from '@/features/admin/projects/components/project-delete-dialog';
import { ProjectFormDialog } from '@/features/admin/projects/components/project-form-dialog';
import { ProjectProgressBar } from '@/features/admin/projects/components/project-progress-bar';
import { isProjectPlanLocked } from '@/features/admin/projects/constants/plan-lock';
import type { ProjectActionTarget } from '@/features/admin/projects/hooks/use-project-list-actions';
import type { ProjectDetail } from '@/features/admin/projects/types';
import {
  createProjectTask,
  deleteProjectTask,
  getProjectTaskBoard,
  moveProjectTask,
  updateProjectTask,
} from '../api/project-tasks';
import type { ProjectTask, ProjectTaskBoardResponse, ProjectTaskStatus } from '../types';
import { ProjectTaskFormDialog } from './project-task-form-dialog';
import { ProjectTaskKanbanBoard } from './project-task-kanban-board';
import { ProjectViewPlanModal } from './project-view-plan-modal';
import { ProjectWorkspaceShell } from './project-workspace-shell';

export function ProjectTaskBoardPage({ projectId }: { projectId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useAdminToast();
  const { pending, run } = useAsyncAction();
  const [completeOpen, setCompleteOpen] = useState(false);
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [board, setBoard] = useState<ProjectTaskBoardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [defaultPhaseId, setDefaultPhaseId] = useState<string | undefined>();
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectTask | null>(null);
  const [viewPlanUserOpen, setViewPlanUserOpen] = useState(false);
  const [deleteProjectTarget, setDeleteProjectTarget] = useState<ProjectActionTarget | null>(null);
  const [statusToggleTarget, setStatusToggleTarget] = useState<ProjectActionTarget | null>(null);
  const [projectFormOpen, setProjectFormOpen] = useState(false);
  const [viewOnlyTask, setViewOnlyTask] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [detail, boardData] = await Promise.all([
        getProject(projectId),
        getProjectTaskBoard(projectId),
      ]);
      setProject(detail);
      setBoard(boardData);
    } catch {
      setError('Unable to load this project board.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- board fetch on project change
    void load();
  }, [load]);

  const viewPlanFromQuery = searchParams.get('viewPlan') === '1';
  const viewPlanOpen = viewPlanUserOpen || (viewPlanFromQuery && Boolean(board));

  const clearViewPlanQuery = useCallback(() => {
    if (searchParams.get('viewPlan') !== '1') return;
    router.replace(`/admin/project-tasks/${projectId}`, { scroll: false });
  }, [projectId, router, searchParams]);

  useEffect(() => {
    if (!board) return;
    const lifecycle = board.project.executionLifecycle;
    if (lifecycle === 'NOT_PLANNED' || lifecycle === 'PLANNED') {
      router.replace(`/admin/project-tasks/${projectId}/plan`);
    }
  }, [board, projectId, router]);

  const lifecycle = board?.project.executionLifecycle;
  const planLocked = lifecycle ? isProjectPlanLocked(lifecycle) : false;
  const readOnly = lifecycle === 'COMPLETED';
  const taskFormMode = readOnly
    ? 'readonly'
    : !editingTask
      ? 'plan'
      : viewOnlyTask
        ? 'readonly'
        : planLocked
          ? 'execution'
          : 'plan';
  const tasks = useMemo(() => board?.phases.flatMap((phase) => phase.tasks) ?? [], [board]);
  const phases = useMemo(() => board?.phases ?? [], [board]);

  const openCreate = (phaseId?: string) => {
    setViewOnlyTask(false);
    setEditingTask(null);
    setDefaultPhaseId(phaseId);
    setFormOpen(true);
  };

  const openView = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId) ?? null;
    setViewOnlyTask(true);
    setEditingTask(task);
    setFormOpen(true);
  };

  const changeTaskStatus = async (taskId: string, status: ProjectTaskStatus) => {
    if (readOnly) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    try {
      await run(() =>
        updateProjectTask(projectId, taskId, { status, labels: [...task.labels] }),
      );
      toast.success('Task status updated.');
      await load();
    } catch (failure) {
      toast.error(describeCrmError(failure));
    }
  };

  const persistMove = async (input: {
    taskId: string;
    phaseId: string;
    beforeTaskId: string | null;
  }) => {
    if (readOnly) return;
    try {
      await run(() =>
        moveProjectTask(projectId, input.taskId, {
          phaseId: input.phaseId,
          beforeTaskId: input.beforeTaskId,
        }),
      );
      await load();
    } catch (failure) {
      toast.error(describeCrmError(failure));
      throw failure;
    }
  };

  const confirmCompleteProject = async () => {
    try {
      await run(() => completeProject(projectId));
      toast.success('Project marked completed.');
      setCompleteOpen(false);
      await load();
    } catch (failure) {
      toast.error(describeCrmError(failure));
    }
  };

  const handleSave = async (payload: Parameters<typeof createProjectTask>[1]) => {
    if (readOnly) return;
    if (editingTask) {
      await updateProjectTask(projectId, editingTask.id, payload);
      toast.success('Task updated.');
    } else {
      await createProjectTask(projectId, payload);
      toast.success('Task created.');
    }
    await load();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await run(() => deleteProjectTask(projectId, deleteTarget.id));
      toast.success('Task deleted.');
      setDeleteTarget(null);
      await load();
    } catch (failure) {
      toast.error(describeCrmError(failure));
    }
  };

  const toggleActive = async (target: ProjectActionTarget) => {
    const nextStatus = target.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await run(() => changeProjectStatus(target.id, { status: nextStatus }));
      toast.success(nextStatus === 'ACTIVE' ? 'Project activated.' : 'Project marked inactive.');
      await load();
    } catch (failure) {
      toast.error(describeCrmError(failure));
    }
  };

  const confirmToggleActive = async () => {
    if (!statusToggleTarget) return;
    const target = statusToggleTarget;
    setStatusToggleTarget(null);
    await toggleActive(target);
  };

  const confirmDeleteProject = async () => {
    if (!deleteProjectTarget) return;
    const target = deleteProjectTarget;
    try {
      await run(() => deleteProjectApi(target.id));
      toast.success(`Project "${target.projectNumber}" deleted.`);
      setDeleteProjectTarget(null);
      router.push('/admin/project-tasks');
    } catch (failure) {
      toast.error(describeCrmError(failure));
    }
  };

  const actionsBusy = pending;

  if (loading && !board) {
    return <CrmLoadingRows rows={8} />;
  }

  if (error || !board || !project) {
    return (
      <div className="grid gap-3">
        <CrmErrorAlert message={error ?? 'Project not found.'} />
        <Button type="button" variant="outline" onClick={() => void load()}>
          Retry
        </Button>
      </div>
    );
  }

  const boardProject = board.project;

  return (
    <>
      <ProjectWorkspaceShell
        project={project}
        breadcrumbTail="Production"
        actionsDisabled={actionsBusy || readOnly}
        onToggleActive={(target) => setStatusToggleTarget(target)}
        onEditProject={() => setProjectFormOpen(true)}
        onDeleteProject={(target) => setDeleteProjectTarget(target)}
      >
        <div className="-mx-4 mb-4 sm:-mx-5">
          <div className="flex min-w-0 flex-wrap items-start justify-between gap-3 px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <h2 className="text-foreground text-lg font-semibold tracking-tight">Production Board</h2>
              <p className="text-muted-foreground mt-0.5 text-sm">
                Track task progress across phases. Drag tasks to update workflow.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => setViewPlanUserOpen(true)}
              >
                <FileText className="size-4" aria-hidden="true" />
                View Plan
              </Button>
              {boardProject.executionLifecycle === 'IN_PRODUCTION' ? (
                <Button
                  type="button"
                  size="sm"
                  className="h-9 border-0 bg-gradient-to-r from-neutral-950 via-neutral-800 to-neutral-950 text-white shadow-xs hover:from-neutral-900 hover:via-neutral-700 hover:to-neutral-900"
                  disabled={actionsBusy}
                  onClick={() => setCompleteOpen(true)}
                >
                  Complete Project
                </Button>
              ) : null}
            </div>
          </div>
          <div className="border-border border-t px-4 py-3 sm:px-5">
            <ProjectProgressBar percent={boardProject.progressPercent} className="w-full min-w-0" />
          </div>
        </div>

        <ProjectTaskKanbanBoard
          phases={phases}
          tasks={tasks}
          columnVariant="pipeline"
          cardVariant="pipeline"
          showPhaseTimelineHint={lifecycle === 'IN_PRODUCTION'}
          disabled={actionsBusy || readOnly}
          dragDisabled={actionsBusy}
          onPersistMove={persistMove}
          onView={openView}
          onEdit={openView}
          onDelete={
            readOnly
              ? () => {}
              : (taskId) => {
                  const task = tasks.find((t) => t.id === taskId);
                  if (task) setDeleteTarget(task);
                }
          }
          onAddInPhase={readOnly ? () => {} : (phaseId) => openCreate(phaseId)}
          onTaskStatusChange={readOnly ? undefined : changeTaskStatus}
        />
      </ProjectWorkspaceShell>

      <ProjectViewPlanModal
        open={viewPlanOpen}
        onOpenChange={(open) => {
          setViewPlanUserOpen(open);
          if (!open) clearViewPlanQuery();
        }}
        projectId={projectId}
        project={project}
      />
      <ProjectTaskFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setViewOnlyTask(false);
        }}
        phases={phases}
        editingTask={editingTask}
        defaultPhaseId={defaultPhaseId}
        mode={taskFormMode}
        onSubmit={handleSave}
      />
      <AlertDialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete project?</AlertDialogTitle>
            <AlertDialogDescription>
              Mark “{project.name}” as completed? All tasks must be finished. The server will record
              the completion timestamp.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmCompleteProject()}>
              Complete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes “{deleteTarget?.title}” permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ProjectDeleteDialog
        target={deleteProjectTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteProjectTarget(null);
        }}
        onConfirm={() => void confirmDeleteProject()}
      />

      <AlertDialog
        open={Boolean(statusToggleTarget)}
        onOpenChange={(open) => {
          if (!open) setStatusToggleTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {statusToggleTarget?.status === 'ACTIVE' ? 'Deactivate project?' : 'Activate project?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {statusToggleTarget?.status === 'ACTIVE'
                ? `Mark “${statusToggleTarget.name}” (${statusToggleTarget.projectNumber}) as inactive? It will be hidden from active workflows until you activate it again.`
                : `Mark “${statusToggleTarget?.name}” (${statusToggleTarget?.projectNumber}) as active?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmToggleActive()}>
              {statusToggleTarget?.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ProjectFormDialog
        open={projectFormOpen}
        editingId={projectId}
        onOpenChange={setProjectFormOpen}
        onSaved={() => void load()}
      />
    </>
  );
}
