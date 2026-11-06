'use client';

import { useCallback } from 'react';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';
import { updateServicePackage } from '../api/service-packages.api';
import type { CrmServicePackage, UpdateServicePackageRequest } from '../types/service-package.types';

export function useUpdateServicePackage() {
  const { pending, run } = useAsyncAction();

  const mutate = useCallback(
    async (id: string, body: UpdateServicePackageRequest): Promise<CrmServicePackage | undefined> =>
      run(() => updateServicePackage(id, body)),
    [run],
  );

  return { updateServicePackage: mutate, pending };
}
