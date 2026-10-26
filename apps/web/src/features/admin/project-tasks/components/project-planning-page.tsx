'use client';

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
import { AdminBreadcrumb } from '@/features/admin/components/admin-page-header';
import { useAdminToast } from '@/features/admin/components/toast';
import { CrmErrorAlert, CrmLoadingRows } from '@/features/admin/crm/components/crm-feedback';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';
import { describeCrmError } from '@/features/admin/crm/utils/errors';
import { formatDateOnly } from '@/features/admin/crm/utils/format';
import { getProject, saveProjectPlan } from '@/features/admin/projects/api/projects';
import { ProjectExecutionLifecycleBadge } from '@/features/admin/projects/components/project-execution-lifecycle-badge';
import { ProjectPriorityBadge } from '@/features/admin/projects/components/project-priority-badge';
import type { ProjectDetail } from '@/features/admin/projects/types';
import { ProjectPlanLockNotice } from '@/features/admin/projects/components/project-plan-lock-notice';
import {
  isProjectPlanLocked,
  PROJECT_PLAN_LOCKED_MESSAGE,
} from '@/features/admin/projects/constants/plan-lock';
import type { SaveProjectPlanRequest } from '@techwin/validation';
import {
  createProjectTask,
  deleteProjectTask,
  getProjectTaskBoard,
  moveProjectTask,
  updateProjectTask,
} from '../api/project-tasks';
import type { ProjectTask, ProjectTaskBoardResponse } from '../types';
import { ProjectTaskFormDialog } from './project-task-form-dialog';
import { ProjectTaskKanbanBoard } from './project-task-kanban-board';

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

  const buildPlanPayload = (): SaveProjectPlanRequest | null => {
    if (!project || !board) return null;
    const ownerByPhaseId = new Map(project.phases.map((phase) => [phase.id, phase.ownerAdminId]));
    return {
      phases: board.phases.map((phase) => ({
        id: phase.id,
        name: phase.name,
        description: phase.description,
        startDate: phase.startDate,
        expectedEndDate: phase.expectedEndDate,
        ownerAdminId: ownerByPhaseId.get(phase.id) ?? null,
        tasks: phase.tasks.map((task) => ({
          id: task.id,
          title: task.title,
          description: task.description || undefined,
          priority: task.priority,
          assigneeAdminId: task.assigneeAdminId,
          startDate: task.startDate,
          dueDate: task.dueDate,
        })),
      })),
    };
  };

  const savePlan = async () => {
    const payload = buildPlanPayload();
    if (!payload) return;
    try {
      await run(() => saveProjectPlan(projectId, payload));
      toast.success('Plan saved. Project is now Planned.');
      await load();
    } catch (failure) {
      toast.error(describeCrmError(failure));
    }
  };

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
    <div className="grid w-full min-w-0 max-w-full gap-2">
      <AdminBreadcrumb
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin/dashboard' },
          { label: 'Project Management', href: '/admin/project-tasks' },
          { label: project.name, href: `/admin/project-tasks/${projectId}` },
          { label: readOnly ? 'View plan' : 'Planning' },
        ]}
        className="mb-0"
      />
      <section className="border-border/60 bg-card/40 rounded-lg border px-3 py-3 sm:px-4">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-muted-foreground text-xs font-medium tabular-nums">
              {project.projectNumber}
            </p>
            <h1 className="text-lg font-semibold sm:text-xl">{project.name}</h1>
            <p className="text-muted-foreground text-sm">{project.clientName}</p>
            {project.projectManagerName ? (
              <p className="text-muted-foreground text-xs">
                Project manager: {project.projectManagerName}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <ProjectExecutionLifecycleBadge lifecycle={project.executionLifecycle} />
              <ProjectPriorityBadge priority={project.priority} />
            </div>
            <p className="text-foreground text-xs tabular-nums">
              Planned: {formatDateOnly(project.startDate)} –{' '}
              {formatDateOnly(project.expectedEndDate)}
            </p>
            {project.scopeAndRequirements?.trim() ? (
              <p className="text-muted-foreground line-clamp-3 text-xs">
                {project.scopeAndRequirements}
              </p>
            ) : null}
          </div>
          {!readOnly ? (
            <Button type="button" onClick={() => void savePlan()} disabled={pending}>
              Save Plan
            </Button>
          ) : null}
        </div>
        {readOnly ? (
          <ProjectPlanLockNotice
            className="mt-3"
            message={
              project.executionLifecycle === 'COMPLETED'
                ? 'Completed projects are read-only.'
                : PROJECT_PLAN_LOCKED_MESSAGE
            }
          />
        ) : null}
      </section>
      <ProjectTaskKanbanBoard
        phases={phases}
        tasks={tasks}
        disabled={pending || readOnly}
        onPersistMove={persistMove}
        onView={openEdit}
        onEdit={openEdit}
        onDelete={(taskId) => {
          if (readOnly) return;
          const task = tasks.find((t) => t.id === taskId);
          if (task) setDeleteTarget(task);
        }}
        onAddInPhase={readOnly ? () => {} : (phaseId) => openCreate(phaseId)}
      />
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
        </>
      ) : null}
    </div>
  );
}
