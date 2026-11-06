'use client';

import { useCallback } from 'react';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';
import { deleteQuotation } from '../api/quotations.api';

export function useDeleteQuotation() {
  const { pending, run } = useAsyncAction();
  const mutate = useCallback(async (id: string): Promise<void> => run(() => deleteQuotation(id)), [run]);
  return { deleteQuotation: mutate, pending };
}
