'use client';

import { clientListQuerySchema } from '@techwin/validation';
import { useCallback, useMemo } from 'react';
import { listClients } from '../api/clients.api';
import type { ClientListQuery, CrmClientListResponse } from '../types/client.types';
import { clientKeys } from './client.keys';
import { useClientAsyncResource } from './use-client-async-resource';

export type UseClientsOptions = {
  readonly query: Partial<ClientListQuery>;
  readonly enabled?: boolean;
};

export function useClients({ query, enabled = true }: UseClientsOptions) {
  const parsedQuery = useMemo((): ClientListQuery => {
    const result = clientListQuerySchema.safeParse(query);
    const parsed = result.success ? result.data : {};
    return {
      page: parsed.page ?? query.page ?? 1,
      pageSize: parsed.pageSize ?? query.pageSize ?? 10,
      search: parsed.search,
      status: parsed.status,
      type: parsed.type,
      includeArchived: parsed.includeArchived,
      createdFrom: parsed.createdFrom,
      createdTo: parsed.createdTo,
      sort: parsed.sort,
      sortDir: parsed.sortDir,
    };
  }, [query]);

  const cacheKey = JSON.stringify(clientKeys.list(parsedQuery));

  const loader = useCallback(() => listClients(parsedQuery), [parsedQuery]);

  const { data, loading, error, refetch } = useClientAsyncResource<CrmClientListResponse>(
    cacheKey,
    enabled,
    loader,
  );

  return {
    clients: data?.clients ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? parsedQuery.page ?? 1,
    pageSize: data?.pageSize ?? parsedQuery.pageSize ?? 10,
    loading,
    error,
    refetch,
  };
}
