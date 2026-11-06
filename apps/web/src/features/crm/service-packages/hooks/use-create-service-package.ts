'use client';

import { useCallback } from 'react';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';
import { createServicePackage } from '../api/service-packages.api';
import type { CreateServicePackageRequest, CrmServicePackage } from '../types/service-package.types';

export function useCreateServicePackage() {
  const { pending, run } = useAsyncAction();

  const mutate = useCallback(
    async (body: CreateServicePackageRequest): Promise<CrmServicePackage | undefined> =>
      run(() => createServicePackage(body)),
    [run],
  );

  return { createServicePackage: mutate, pending };
}
