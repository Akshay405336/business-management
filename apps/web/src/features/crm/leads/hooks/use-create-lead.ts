'use client';

import { useCallback } from 'react';
import { createLead } from '../api/lead.api';
import type { CreateLeadRequest, CrmLead } from '../types/lead.types';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';

export function useCreateLead() {
  const { pending, run } = useAsyncAction();

  const mutate = useCallback(
    async (body: CreateLeadRequest): Promise<CrmLead | undefined> =>
      run(() => createLead(body)),
    [run],
  );

  return { createLead: mutate, pending };
}
