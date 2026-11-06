'use client';

import { useCallback } from 'react';
import { convertLead } from '../api/lead.api';
import type { CrmLeadConvertResponse } from '../types/lead.types';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';

export function useConvertLead() {
  const { pending, run } = useAsyncAction();

  const mutate = useCallback(
    async (id: string): Promise<CrmLeadConvertResponse | undefined> =>
      run(() => convertLead(id)),
    [run],
  );

  return { convertLead: mutate, pending };
}
