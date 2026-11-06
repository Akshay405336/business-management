'use client';

import { useCallback } from 'react';
import { getServicePackage } from '../api/service-packages.api';
import { servicePackageKeys } from './service-package.keys';
import { useServicePackageAsyncResource } from './use-service-package-async-resource';

export function useServicePackage(packageId: string | null, enabled = true) {
  const active = Boolean(packageId && enabled);
  const cacheKey = active
    ? JSON.stringify(servicePackageKeys.detail(packageId!))
    : 'service-package:none';

  const loader = useCallback(async () => {
    if (!packageId) throw new Error('Package id is required.');
    return getServicePackage(packageId);
  }, [packageId]);

  const { data, loading, error, refetch } = useServicePackageAsyncResource(
    cacheKey,
    active,
    loader,
  );

  return { package: data, loading, error, refetch };
}
