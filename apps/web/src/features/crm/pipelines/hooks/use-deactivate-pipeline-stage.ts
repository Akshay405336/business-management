'use client';

import { useCallback } from 'react';
import { deactivatePipelineStage } from '../api/pipeline.api';
import type { CrmPipelineStage } from '../types/pipeline.types';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';

export function useDeactivatePipelineStage() {
  const { pending, run } = useAsyncAction();

  const mutate = useCallback(
    async (
      pipelineId: string,
      stageId: string,
      targetStageId?: string,
    ): Promise<CrmPipelineStage | undefined> =>
      run(() => deactivatePipelineStage(pipelineId, stageId, targetStageId)),
    [run],
  );

  return { deactivatePipelineStage: mutate, pending };
}
