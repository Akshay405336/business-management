'use client';

import { useCallback } from 'react';
import { activatePipelineStage } from '../api/pipeline.api';
import type { CrmPipelineStage } from '../types/pipeline.types';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';

export function useActivatePipelineStage() {
  const { pending, run } = useAsyncAction();

  const mutate = useCallback(
    async (pipelineId: string, stageId: string): Promise<CrmPipelineStage | undefined> =>
      run(() => activatePipelineStage(pipelineId, stageId)),
    [run],
  );

  return { activatePipelineStage: mutate, pending };
}
