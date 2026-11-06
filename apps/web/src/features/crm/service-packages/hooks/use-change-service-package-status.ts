'use client';

import { useCallback } from 'react';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';
import { changeServicePackageStatus } from '../api/service-packages.api';
import type { CrmServicePackage, ServicePackageStatus } from '../types/service-package.types';

export function useChangeServicePackageStatus() {
  const { pending, run } = useAsyncAction();

  const mutate = useCallback(
    async (id: string, status: ServicePackageStatus): Promise<CrmServicePackage | undefined> =>
      run(() => changeServicePackageStatus(id, status)),
    [run],
  );

  return { changeServicePackageStatus: mutate, pending };
}
