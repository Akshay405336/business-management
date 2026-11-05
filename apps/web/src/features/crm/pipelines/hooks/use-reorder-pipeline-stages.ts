'use client';

import { useCallback } from 'react';
import { reorderPipelineStages } from '../api/pipeline.api';
import type { CrmPipelineStage, ReorderPipelineStagesRequest } from '../types/pipeline.types';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';

export function useReorderPipelineStages() {
  const { pending, run } = useAsyncAction();

  const mutate = useCallback(
    async (
      pipelineId: string,
      body: ReorderPipelineStagesRequest,
    ): Promise<readonly CrmPipelineStage[] | undefined> =>
      run(() => reorderPipelineStages(pipelineId, body)),
    [run],
  );

  return { reorderPipelineStages: mutate, pending };
}
