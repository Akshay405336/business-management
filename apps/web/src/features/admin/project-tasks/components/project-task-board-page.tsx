'use client';

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
import { AdminBreadcrumb } from '@/features/admin/components/admin-page-header';
import { useAdminToast } from '@/features/admin/components/toast';
import { CrmErrorAlert, CrmLoadingRows } from '@/features/admin/crm/components/crm-feedback';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';
import { describeCrmError } from '@/features/admin/crm/utils/errors';
import { completeProject } from '@/features/admin/projects/api/projects';
import { isProjectPlanLocked } from '@/features/admin/projects/constants/plan-lock';
import {
  createProjectTask,
  deleteProjectTask,
  getProjectTaskBoard,
  moveProjectTask,
  updateProjectTask,
} from '../api/project-tasks';
import type { ProjectTask, ProjectTaskBoardResponse } from '../types';
import { ProjectBoardOverview } from './project-board-overview';
import { ProjectTaskFormDialog } from './project-task-form-dialog';
import { ProjectTaskKanbanBoard } from './project-task-kanban-board';
import { ProjectViewPlanModal } from './project-view-plan-modal';

export function ProjectTaskBoardPage({ projectId }: { projectId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useAdminToast();
  const { pending, run } = useAsyncAction();
  const [completeOpen, setCompleteOpen] = useState(false);
  const [board, setBoard] = useState<ProjectTaskBoardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [defaultPhaseId, setDefaultPhaseId] = useState<string | undefined>();
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectTask | null>(null);
  const [viewPlanUserOpen, setViewPlanUserOpen] = useState(false);
  const viewPlanFromQuery = searchParams.get('viewPlan') === '1';
  const viewPlanOpen = viewPlanUserOpen || (viewPlanFromQuery && Boolean(board));

  const clearViewPlanQuery = useCallback(() => {
    if (searchParams.get('viewPlan') !== '1') return;
    router.replace(`/admin/project-tasks/${projectId}`, { scroll: false });
  }, [projectId, router, searchParams]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getProjectTaskBoard(projectId);
      setBoard(data);
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
  const taskFormMode = readOnly ? 'readonly' : planLocked ? 'execution' : 'plan';
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
    if (planLocked) return;
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
    if (readOnly || (planLocked && !editingTask)) return;
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

  if (loading && !board) {
    return <CrmLoadingRows rows={8} />;
  }

  if (error || !board) {
    return (
      <div className="grid gap-3">
        <CrmErrorAlert message={error ?? 'Project not found.'} />
        <Button type="button" variant="outline" onClick={() => void load()}>
          Retry
        </Button>
      </div>
    );
  }

  const { project } = board;

  return (
    <div className="grid w-full min-w-0 max-w-full gap-2">
      <AdminBreadcrumb
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin/dashboard' },
          { label: 'Project Management', href: '/admin/project-tasks' },
          { label: project.name },
        ]}
        className="mb-0"
      />
      <ProjectBoardOverview
        board={board}
        onAddTask={() => openCreate()}
        addTaskDisabled={pending || readOnly || planLocked}
        onCompleteProject={
          board.project.executionLifecycle === 'IN_PRODUCTION'
            ? () => setCompleteOpen(true)
            : undefined
        }
        completeDisabled={pending}
        onViewPlan={() => setViewPlanUserOpen(true)}
      />
      <ProjectViewPlanModal
        open={viewPlanOpen}
        onOpenChange={(open) => {
          setViewPlanUserOpen(open);
          if (!open) clearViewPlanQuery();
        }}
        projectId={projectId}
        board={board}
      />
      <ProjectTaskKanbanBoard
        phases={phases}
        tasks={tasks}
        disabled={pending || readOnly || planLocked}
        onPersistMove={persistMove}
        onView={openEdit}
        onEdit={openEdit}
        onDelete={
          readOnly || planLocked
            ? () => {}
            : (taskId) => {
                const task = tasks.find((t) => t.id === taskId);
                if (task) setDeleteTarget(task);
              }
        }
        onAddInPhase={readOnly || planLocked ? () => {} : (phaseId) => openCreate(phaseId)}
      />
      <ProjectTaskFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
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
    </div>
  );
}
