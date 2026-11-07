'use client';

import { useCallback } from 'react';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';
import { updateEmployee } from '../api/employee.api';
import type { EmployeeDetail, UpdateEmployeeRequest } from '../types';

export function useUpdateEmployee() {
  const { pending, run } = useAsyncAction();
  const mutate = useCallback(
    (id: string, body: UpdateEmployeeRequest): Promise<EmployeeDetail | undefined> =>
      run(() => updateEmployee(id, body)),
    [run],
  );
  return { updateEmployee: mutate, pending };
}
