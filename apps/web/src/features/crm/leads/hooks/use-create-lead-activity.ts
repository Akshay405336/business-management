'use client';

import { useCallback } from 'react';
import { createLeadActivity } from '../api/lead.api';
import type { CreateLeadActivityRequest, CrmLeadActivity } from '../types/lead.types';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';

export function useCreateLeadActivity() {
  const { pending, run } = useAsyncAction();

  const mutate = useCallback(
    async (leadId: string, body: CreateLeadActivityRequest): Promise<CrmLeadActivity | undefined> =>
      run(() => createLeadActivity(leadId, body)),
    [run],
  );

  return { createLeadActivity: mutate, pending };
}
