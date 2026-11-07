'use client';

import { useCallback } from 'react';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';
import { deleteLeaveType } from '../api/leave-type.api';

export function useDeleteLeaveType() {
  const { pending, run } = useAsyncAction();

  const mutate = useCallback(
    async (id: string): Promise<void | undefined> => run(() => deleteLeaveType(id)),
    [run],
  );

  return { deleteLeaveType: mutate, pending };
}
