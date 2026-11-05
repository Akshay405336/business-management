'use client';

import { useCallback } from 'react';
import { bulkUpdatePipelineStatus, type BulkPipelineStatusRequest } from '../api/pipeline.api';
import type { CrmPipelineBulkActionResponse } from '../types/pipeline.types';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';

export function useBulkUpdatePipelineStatus() {
  const { pending, run } = useAsyncAction();

  const mutate = useCallback(
    async (body: BulkPipelineStatusRequest): Promise<CrmPipelineBulkActionResponse | undefined> =>
      run(() => bulkUpdatePipelineStatus(body)),
    [run],
  );

  return { bulkUpdatePipelineStatus: mutate, pending };
}
