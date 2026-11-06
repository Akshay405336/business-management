'use client';

import { useCallback } from 'react';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';
import { updateQuotation } from '../api/quotations.api';
import type { CrmQuotation, UpdateQuotationRequest } from '../types/quotation.types';

export function useUpdateQuotation() {
  const { pending, run } = useAsyncAction();
  const mutate = useCallback(
    async (id: string, body: UpdateQuotationRequest): Promise<CrmQuotation | undefined> =>
      run(() => updateQuotation(id, body)),
    [run],
  );
  return { updateQuotation: mutate, pending };
}
