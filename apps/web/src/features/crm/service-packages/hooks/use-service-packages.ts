'use client';

import { useCallback } from 'react';
import { listServicePackages } from '../api/service-packages.api';
import { servicePackageKeys } from './service-package.keys';
import { useServicePackageAsyncResource } from './use-service-package-async-resource';

export type UseServicePackagesOptions = {
  readonly enabled?: boolean;
};

export function useServicePackages({ enabled = true }: UseServicePackagesOptions = {}) {
  const cacheKey = JSON.stringify(servicePackageKeys.list());

  const loader = useCallback(async () => {
    const result = await listServicePackages();
    return result.packages;
  }, []);

  const { data, loading, error, refetch } = useServicePackageAsyncResource(
    cacheKey,
    enabled,
    loader,
  );

  return {
    packages: data,
    loading,
    error,
    refetch,
  };
}
