'use client';

import { useCallback, useState } from 'react';
import { useAdminToast } from '@/features/admin/components/toast';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';
import { describeCrmError } from '@/features/admin/crm/utils/errors';
import { changeProjectStatus, deleteProject } from '../api/projects';
import type { ProjectStatus } from '../types';

export type ProjectActionTarget = {
  readonly id: string;
  readonly name: string;
  readonly projectNumber: string;
  readonly status: ProjectStatus;
};

export function useProjectListActions(onRefresh: () => Promise<void>) {
  const toast = useAdminToast();
  const { pending, run } = useAsyncAction();
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectActionTarget | null>(null);

  const openCreate = useCallback(() => {
    setEditingId(null);
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((id: string) => {
    setEditingId(id);
    setFormOpen(true);
  }, []);

  const toggleActive = useCallback(
    async (project: ProjectActionTarget) => {
      const nextStatus: ProjectStatus = project.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      try {
        await run(() => changeProjectStatus(project.id, { status: nextStatus }));
        toast.success(
          nextStatus === 'ACTIVE' ? 'Project activated.' : 'Project marked inactive.',
        );
        await onRefresh();
      } catch (failure) {
        toast.error(describeCrmError(failure));
      }
    },
    [onRefresh, run, toast],
  );

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      await run(() => deleteProject(target.id));
      toast.success(`Project "${target.projectNumber}" deleted.`);
      await onRefresh();
    } catch (failure) {
      toast.error(describeCrmError(failure));
    }
  }, [deleteTarget, onRefresh, run, toast]);

  return {
    pending,
    formOpen,
    setFormOpen,
    editingId,
    openCreate,
    openEdit,
    deleteTarget,
    setDeleteTarget,
    confirmDelete,
    toggleActive,
  };
}
