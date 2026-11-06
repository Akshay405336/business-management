'use client';

import { useCallback } from 'react';
import { getClient } from '../api/clients.api';
import { clientKeys } from './client.keys';
import { useClientAsyncResource } from './use-client-async-resource';

export function useClient(clientId: string | null, enabled = true) {
  const active = Boolean(clientId && enabled);
  const cacheKey = active ? JSON.stringify(clientKeys.detail(clientId!)) : 'client:none';

  const loader = useCallback(async () => {
    if (!clientId) throw new Error('Client id is required.');
    return getClient(clientId);
  }, [clientId]);

  const { data, loading, error, refetch } = useClientAsyncResource(cacheKey, active, loader);

  return { client: data, loading, error, refetch };
}
