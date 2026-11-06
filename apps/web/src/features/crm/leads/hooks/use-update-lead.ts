'use client';

import { useCallback } from 'react';
import { updateLead } from '../api/lead.api';
import type { CrmLead, UpdateLeadRequest } from '../types/lead.types';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';

export function useUpdateLead() {
  const { pending, run } = useAsyncAction();

  const mutate = useCallback(
    async (id: string, body: UpdateLeadRequest): Promise<CrmLead | undefined> =>
      run(() => updateLead(id, body)),
    [run],
  );

  return { updateLead: mutate, pending };
}
