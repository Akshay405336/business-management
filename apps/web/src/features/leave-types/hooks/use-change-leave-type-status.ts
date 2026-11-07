'use client';

import { useCallback } from 'react';
import type { LeaveTypeItem, LeaveTypeStatus } from '@techwin/contracts';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';
import { changeLeaveTypeStatus } from '../api/leave-type.api';

export function useChangeLeaveTypeStatus() {
  const { pending, run } = useAsyncAction();

  const mutate = useCallback(
    async (id: string, status: LeaveTypeStatus): Promise<LeaveTypeItem | undefined> =>
      run(() => changeLeaveTypeStatus(id, { status })),
    [run],
  );

  return { changeLeaveTypeStatus: mutate, pending };
}
