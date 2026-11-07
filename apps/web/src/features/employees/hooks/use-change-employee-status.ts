'use client';

import { useCallback } from 'react';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';
import { changeEmployeeStatus } from '../api/employee.api';
import type { ChangeEmployeeStatusRequest, EmployeeDetail } from '../types';

export function useChangeEmployeeStatus() {
  const { pending, run } = useAsyncAction();
  const mutate = useCallback(
    (id: string, body: ChangeEmployeeStatusRequest): Promise<EmployeeDetail | undefined> =>
      run(() => changeEmployeeStatus(id, body)),
    [run],
  );
  return { changeEmployeeStatus: mutate, pending };
}
