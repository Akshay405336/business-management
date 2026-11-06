'use client';

import { useCallback } from 'react';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';
import { createQuotation } from '../api/quotations.api';
import type { CreateQuotationRequest, CrmQuotation } from '../types/quotation.types';

export function useCreateQuotation() {
  const { pending, run } = useAsyncAction();
  const mutate = useCallback(
    async (body: CreateQuotationRequest): Promise<CrmQuotation | undefined> =>
      run(() => createQuotation(body)),
    [run],
  );
  return { createQuotation: mutate, pending };
}
