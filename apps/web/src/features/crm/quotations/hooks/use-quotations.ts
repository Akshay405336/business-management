'use client';

import { quotationListQuerySchema } from '@techwin/validation';
import { useCallback, useMemo } from 'react';
import { listQuotations } from '../api/quotations.api';
import type { CrmQuotationListResponse, QuotationListQuery } from '../types/quotation.types';
import { quotationKeys } from './quotation.keys';
import { useQuotationAsyncResource } from './use-quotation-async-resource';

export type UseQuotationsOptions = {
  readonly query: Partial<QuotationListQuery>;
  readonly enabled?: boolean;
};

export function useQuotations({ query, enabled = true }: UseQuotationsOptions) {
  const parsedQuery = useMemo((): QuotationListQuery => {
    const result = quotationListQuerySchema.safeParse(query);
    return result.success ? result.data : { page: 1, pageSize: 10 };
  }, [query]);

  const cacheKey = JSON.stringify(quotationKeys.list(parsedQuery));

  const loader = useCallback(
    () => listQuotations(parsedQuery),
    [parsedQuery],
  );

  const { data, loading, error, refetch } = useQuotationAsyncResource<CrmQuotationListResponse>(
    cacheKey,
    enabled,
    loader,
  );

  return {
    items: data?.items ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? parsedQuery.page,
    pageSize: data?.pageSize ?? parsedQuery.pageSize,
    loading,
    error,
    refetch,
  };
}
