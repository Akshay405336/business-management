'use client';

import { useCallback } from 'react';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';
import { deleteServicePackage } from '../api/service-packages.api';

export function useDeleteServicePackage() {
  const { pending, run } = useAsyncAction();

  const mutate = useCallback(
    async (id: string): Promise<void | undefined> => run(() => deleteServicePackage(id)),
    [run],
  );

  return { deleteServicePackage: mutate, pending };
}
