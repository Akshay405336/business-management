'use client';

import { useCallback } from 'react';
import type { LeaveTypeItem } from '@techwin/contracts';
import type { CreateLeaveTypeRequest } from '@techwin/validation';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';
import { createLeaveType } from '../api/leave-type.api';

export function useCreateLeaveType() {
  const { pending, run } = useAsyncAction();

  const mutate = useCallback(
    async (body: CreateLeaveTypeRequest): Promise<LeaveTypeItem | undefined> =>
      run(() => createLeaveType(body)),
    [run],
  );

  return { createLeaveType: mutate, pending };
}
