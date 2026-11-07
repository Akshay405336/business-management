'use client';

import { useCallback } from 'react';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';
import { createEmployee } from '../api/employee.api';
import type { CreateEmployeeRequest, EmployeeDetail } from '../types';

export function useCreateEmployee() {
  const { pending, run } = useAsyncAction();
  const mutate = useCallback(
    (body: CreateEmployeeRequest): Promise<EmployeeDetail | undefined> => run(() => createEmployee(body)),
    [run],
  );
  return { createEmployee: mutate, pending };
}
