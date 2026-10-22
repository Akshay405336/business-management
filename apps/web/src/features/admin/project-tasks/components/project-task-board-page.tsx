'use client';

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

export function ProjectTaskBoardPage({ projectId }: { projectId: string }) {
  const toast = useAdminToast();
  const { pending, run } = useAsyncAction();
  const [board, setBoard] = useState<ProjectTaskBoardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [defaultPhaseId, setDefaultPhaseId] = useState<string | undefined>();
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectTask | null>(null);

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

  const handleSave = async (payload: Parameters<typeof createProjectTask>[1]) => {
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
        addTaskDisabled={pending}
      />
      <ProjectTaskKanbanBoard
        phases={phases}
        tasks={tasks}
        disabled={pending}
        onPersistMove={persistMove}
        onView={openEdit}
        onEdit={openEdit}
        onDelete={(taskId) => {
          const task = tasks.find((t) => t.id === taskId);
          if (task) setDeleteTarget(task);
        }}
        onAddInPhase={(phaseId) => openCreate(phaseId)}
      />
      <ProjectTaskFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        phases={phases}
        editingTask={editingTask}
        defaultPhaseId={defaultPhaseId}
        onSubmit={handleSave}
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
    </div>
  );
}
