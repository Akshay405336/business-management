'use client';

import { useCallback } from 'react';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';
import { deleteEmployee } from '../api/employee.api';
import type { DeleteEmployeeResponse } from '@techwin/contracts';

export function useDeleteEmployee() {
  const { pending, run } = useAsyncAction();
  const mutate = useCallback(
    (id: string): Promise<DeleteEmployeeResponse | undefined> => run(() => deleteEmployee(id)),
    [run],
  );
  return { deleteEmployee: mutate, pending };
}
