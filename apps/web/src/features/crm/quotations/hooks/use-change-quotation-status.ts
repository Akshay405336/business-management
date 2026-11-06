'use client';

import { useCallback } from 'react';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';
import { changeQuotationStatus } from '../api/quotations.api';
import type { ChangeQuotationStatusRequest, CrmQuotation } from '../types/quotation.types';

export function useChangeQuotationStatus() {
  const { pending, run } = useAsyncAction();
  const mutate = useCallback(
    async (id: string, body: ChangeQuotationStatusRequest): Promise<CrmQuotation | undefined> =>
      run(() => changeQuotationStatus(id, body)),
    [run],
  );
  return { changeQuotationStatus: mutate, pending };
}
