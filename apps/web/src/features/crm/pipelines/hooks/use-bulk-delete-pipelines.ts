'use client';

import { useCallback } from 'react';
import { bulkDeletePipelines, type BulkPipelineIdsRequest } from '../api/pipeline.api';
import type { CrmPipelineBulkActionResponse } from '../types/pipeline.types';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';

export function useBulkDeletePipelines() {
  const { pending, run } = useAsyncAction();

  const mutate = useCallback(
    async (body: BulkPipelineIdsRequest): Promise<CrmPipelineBulkActionResponse | undefined> =>
      run(() => bulkDeletePipelines(body)),
    [run],
  );

  return { bulkDeletePipelines: mutate, pending };
}
