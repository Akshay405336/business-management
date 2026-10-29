'use client';

import { Layers } from 'lucide-react';
import { useRouter } from 'next/navigation';
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
  deleteProject as deleteProjectApi,
  getProject,
  saveProjectPlan,
} from '@/features/admin/projects/api/projects';
import { ProjectDeleteDialog } from '@/features/admin/projects/components/project-delete-dialog';
import { ProjectFormDialog } from '@/features/admin/projects/components/project-form-dialog';
import { ProjectPlanLockNotice } from '@/features/admin/projects/components/project-plan-lock-notice';
import {
  isProjectPlanLocked,
  PROJECT_PLAN_LOCKED_MESSAGE,
} from '@/features/admin/projects/constants/plan-lock';
import type { ProjectActionTarget } from '@/features/admin/projects/hooks/use-project-list-actions';
import type { ProjectDetail } from '@/features/admin/projects/types';
import { projectToForm, type ProjectPhaseFormRow } from '@/features/admin/projects/utils/project-form';
import {
  createProjectTask,
  deleteProjectTask,
  getProjectTaskBoard,
  moveProjectTask,
  reorderProjectPhases,
  updateProjectTask,
} from '../api/project-tasks';
import type { ProjectTask, ProjectTaskBoardResponse } from '../types';
import { buildSavePlanPayload } from '../utils/build-save-plan-payload';
import { reorderBoardPhasesWithSlotDates } from '../utils/reorder-phases-with-slot-dates';
import { ProjectAddPhaseDialog } from './project-add-phase-dialog';
import { ProjectManagePhasesDialog } from './project-manage-phases-dialog';
import { ProjectTaskFormDialog } from './project-task-form-dialog';
import { ProjectTaskKanbanBoard } from './project-task-kanban-board';
import { ProjectWorkspaceShell } from './project-workspace-shell';

export function ProjectPlanningPage({ projectId }: { projectId: string }) {
  const router = useRouter();
  const toast = useAdminToast();
  const { pending, run } = useAsyncAction();

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [board, setBoard] = useState<ProjectTaskBoardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [defaultPhaseId, setDefaultPhaseId] = useState<string | undefined>();
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectTask | null>(null);
  const [deleteProjectTarget, setDeleteProjectTarget] = useState<ProjectActionTarget | null>(null);
  const [managePhasesOpen, setManagePhasesOpen] = useState(false);
  const [addPhaseOpen, setAddPhaseOpen] = useState(false);
  const [deletePhaseId, setDeletePhaseId] = useState<string | null>(null);
  const [statusToggleTarget, setStatusToggleTarget] = useState<ProjectActionTarget | null>(null);
  const [projectFormOpen, setProjectFormOpen] = useState(false);

  const readOnly = project ? isProjectPlanLocked(project.executionLifecycle) : false;

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
      setError('Unable to load the planning workspace.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount
    void load();
  }, [load]);

  useEffect(() => {
    if (!project || !readOnly) return;
    router.replace(`/admin/project-tasks/${projectId}?viewPlan=1`);
  }, [project, projectId, readOnly, router]);

  const tasks = useMemo(() => board?.phases.flatMap((phase) => phase.tasks) ?? [], [board]);
  const phases = useMemo(() => board?.phases ?? [], [board]);

  const openCreate = (phaseId?: string) => {
    setEditingTask(null);
    setDefaultPhaseId(phaseId);
    setFormOpen(true);
  };

  const openEdit = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId) ?? null;
    setEditingTask(task);
    setFormOpen(true);
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

  const handleSaveTask = async (payload: Parameters<typeof createProjectTask>[1]) => {
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
    if (!deleteTarget || readOnly) return;
    try {
      await run(() => deleteProjectTask(projectId, deleteTarget.id));
      toast.success('Task deleted.');
      setDeleteTarget(null);
      await load();
    } catch (failure) {
      toast.error(describeCrmError(failure));
    }
  };

  const persistPhaseRows = async (phaseRows: ProjectPhaseFormRow[]) => {
    if (!project || !board) return;
    const payload = buildSavePlanPayload(project, board.phases, phaseRows);
    await run(() => saveProjectPlan(projectId, payload));
    toast.success('Phases updated.');
    await load();
    setManagePhasesOpen(false);
    setAddPhaseOpen(false);
  };

  const savePlan = async () => {
    if (!project || !board) return;
    try {
      const payload = buildSavePlanPayload(project, board.phases);
      await run(() => saveProjectPlan(projectId, payload));
      toast.success('Plan saved. Project is now Planned.');
      router.push('/admin/project-tasks');
    } catch (failure) {
      toast.error(describeCrmError(failure));
    }
  };

  const reorderPhasesOnBoard = async (orderedPhaseIds: readonly string[]) => {
    if (!project || !board || readOnly) return;
    const previousBoard = board;
    const optimisticPhases = reorderBoardPhasesWithSlotDates(board.phases, orderedPhaseIds);
    if (!optimisticPhases) return;

    setBoard({ ...board, phases: optimisticPhases });
    try {
      const updated = await reorderProjectPhases(projectId, {
        orderedPhaseIds: [...orderedPhaseIds],
      });
      setBoard(updated);
    } catch (failure) {
      setBoard(previousBoard);
      toast.error(describeCrmError(failure));
      throw failure;
    }
  };

  const renamePhase = async (phaseId: string, name: string) => {
    if (!project || readOnly) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    const rows = projectToForm(project).phases.map((row) =>
      row.id === phaseId ? { ...row, name: trimmed } : row,
    );
    try {
      await persistPhaseRows(rows);
    } catch (failure) {
      toast.error(describeCrmError(failure));
    }
  };

  const confirmDeletePhase = async () => {
    if (!project || !board || !deletePhaseId) return;
    const phase = board.phases.find((p) => p.id === deletePhaseId);
    if (phase && phase.taskCount > 0) {
      toast.error('Move or delete tasks in this phase before removing it.');
      setDeletePhaseId(null);
      return;
    }
    const rows = projectToForm(project).phases.filter((row) => row.id !== deletePhaseId);
    if (rows.length === 0) {
      toast.error('A project plan must include at least one phase.');
      setDeletePhaseId(null);
      return;
    }
    try {
      await persistPhaseRows(rows);
      setDeletePhaseId(null);
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

  return (
    <>
      <ProjectWorkspaceShell
        project={project}
        breadcrumbTail="Plan"
        actionsDisabled={actionsBusy || readOnly}
        onToggleActive={(target) => setStatusToggleTarget(target)}
        onEditProject={() => setProjectFormOpen(true)}
        onDeleteProject={(target) => setDeleteProjectTarget(target)}
      >
        {readOnly ? (
          <ProjectPlanLockNotice
            message={
              project.executionLifecycle === 'COMPLETED'
                ? 'Completed projects are read-only.'
                : PROJECT_PLAN_LOCKED_MESSAGE
            }
          />
        ) : null}

        <div className="border-border -mx-4 mb-4 border-y sm:-mx-5">
          <div className="flex min-w-0 flex-wrap items-start justify-between gap-3 px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <h2 className="text-foreground text-lg font-semibold tracking-tight">Project Plan</h2>
              <p className="text-muted-foreground mt-0.5 text-sm">
                Manage project phases and tasks. Drag and drop tasks to update status.
              </p>
            </div>
            {!readOnly ? (
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9"
                  onClick={() => setManagePhasesOpen(true)}
                >
                  <Layers className="size-4" aria-hidden="true" />
                  Manage Phases
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-9 border-0 bg-gradient-to-r from-neutral-950 via-neutral-800 to-neutral-950 text-white shadow-xs hover:from-neutral-900 hover:via-neutral-700 hover:to-neutral-900"
                  disabled={actionsBusy}
                  onClick={() => void savePlan()}
                >
                  Save Plan
                </Button>
              </div>
            ) : null}
          </div>
        </div>

        <ProjectTaskKanbanBoard
          phases={phases}
          tasks={tasks}
          columnVariant="plan"
          cardVariant="plan"
          disabled={readOnly}
          dragDisabled={actionsBusy}
          onPersistMove={persistMove}
          onView={openEdit}
          onEdit={openEdit}
          onDelete={(taskId) => {
            if (readOnly) return;
            const task = tasks.find((t) => t.id === taskId);
            if (task) setDeleteTarget(task);
          }}
          onAddInPhase={readOnly ? () => {} : (phaseId) => openCreate(phaseId)}
          onManagePhases={readOnly ? undefined : () => setManagePhasesOpen(true)}
          onDeletePhase={readOnly ? undefined : (phaseId) => setDeletePhaseId(phaseId)}
          onRenamePhase={readOnly ? undefined : renamePhase}
          renameDisabled={actionsBusy}
          onAddPhase={readOnly ? undefined : () => setAddPhaseOpen(true)}
          onPersistPhaseReorder={readOnly ? undefined : reorderPhasesOnBoard}
        />
      </ProjectWorkspaceShell>

      {!readOnly ? (
        <>
          <ProjectTaskFormDialog
            open={formOpen}
            onOpenChange={setFormOpen}
            phases={phases}
            editingTask={editingTask}
            defaultPhaseId={defaultPhaseId}
            onSubmit={handleSaveTask}
          />
          <ProjectManagePhasesDialog
            open={managePhasesOpen}
            onOpenChange={setManagePhasesOpen}
            project={project}
            boardPhases={board.phases}
            saving={pending}
            onSave={persistPhaseRows}
          />
          <ProjectAddPhaseDialog
            open={addPhaseOpen}
            onOpenChange={setAddPhaseOpen}
            project={project}
            saving={pending}
            onAdd={persistPhaseRows}
          />
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
          <AlertDialog open={Boolean(deletePhaseId)} onOpenChange={() => setDeletePhaseId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete phase?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes the phase from the plan. It must have no tasks.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => void confirmDeletePhase()}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : null}

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
