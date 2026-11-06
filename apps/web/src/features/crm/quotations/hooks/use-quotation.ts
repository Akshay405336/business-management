'use client';

import { useCallback } from 'react';
import { getQuotation } from '../api/quotations.api';
import type { CrmQuotation } from '../types/quotation.types';
import { quotationKeys } from './quotation.keys';
import { useQuotationAsyncResource } from './use-quotation-async-resource';

export function useQuotation(id: string | null, enabled = true) {
  const cacheKey = id ? JSON.stringify(quotationKeys.detail(id)) : 'quotation:idle';
  const loader = useCallback(async () => {
    if (!id) throw new Error('Quotation id required.');
    return getQuotation(id);
  }, [id]);

  const { data, loading, error, refetch } = useQuotationAsyncResource<CrmQuotation>(
    cacheKey,
    enabled && Boolean(id),
    loader,
  );

  return { quotation: data, loading, error, refetch };
}
