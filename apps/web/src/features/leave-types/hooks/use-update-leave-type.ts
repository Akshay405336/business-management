'use client';

import { useCallback } from 'react';
import type { LeaveTypeItem } from '@techwin/contracts';
import type { UpdateLeaveTypeRequest } from '@techwin/validation';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';
import { updateLeaveType } from '../api/leave-type.api';

export function useUpdateLeaveType() {
  const { pending, run } = useAsyncAction();

  const mutate = useCallback(
    async (id: string, body: UpdateLeaveTypeRequest): Promise<LeaveTypeItem | undefined> =>
      run(() => updateLeaveType(id, body)),
    [run],
  );

  return { updateLeaveType: mutate, pending };
}
