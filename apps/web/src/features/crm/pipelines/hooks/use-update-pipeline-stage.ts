'use client';

import { useCallback } from 'react';
import { updatePipelineStage } from '../api/pipeline.api';
import type { CrmPipelineStage, UpdatePipelineStageRequest } from '../types/pipeline.types';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';

export function useUpdatePipelineStage() {
  const { pending, run } = useAsyncAction();

  const mutate = useCallback(
    async (
      pipelineId: string,
      stageId: string,
      body: UpdatePipelineStageRequest,
    ): Promise<CrmPipelineStage | undefined> =>
      run(() => updatePipelineStage(pipelineId, stageId, body)),
    [run],
  );

  return { updatePipelineStage: mutate, pending };
}
