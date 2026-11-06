'use client';

import { useCallback } from 'react';
import { changeLeadStage } from '../api/lead.api';
import type { ChangeLeadStageRequest, CrmLead } from '../types/lead.types';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';

export function useChangeLeadStage() {
  const { pending, run } = useAsyncAction();

  const mutate = useCallback(
    async (id: string, body: ChangeLeadStageRequest): Promise<CrmLead | undefined> =>
      run(() => changeLeadStage(id, body)),
    [run],
  );

  return { changeLeadStage: mutate, pending };
}
