'use client';

import { useCallback } from 'react';
import { deleteLead } from '../api/lead.api';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';

export function useDeleteLead() {
  const { pending, run } = useAsyncAction();

  const mutate = useCallback(
    async (id: string): Promise<void | undefined> => run(() => deleteLead(id)),
    [run],
  );

  return { deleteLead: mutate, pending };
}
