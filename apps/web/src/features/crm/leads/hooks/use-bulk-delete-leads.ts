'use client';

import { useCallback } from 'react';
import type { CrmLeadBulkActionResponse } from '@techwin/contracts';
import { bulkDeleteLeads, type BulkLeadIdsRequest } from '../api/lead.api';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';

export function useBulkDeleteLeads() {
  const { pending, run } = useAsyncAction();

  const mutate = useCallback(
    async (body: BulkLeadIdsRequest): Promise<CrmLeadBulkActionResponse | undefined> =>
      run(() => bulkDeleteLeads(body)),
    [run],
  );

  return { bulkDeleteLeads: mutate, pending };
}
