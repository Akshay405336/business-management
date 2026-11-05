'use client';

import { useCallback } from 'react';
import { deletePipelineStage } from '../api/pipeline.api';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';

export function useDeletePipelineStage() {
  const { pending, run } = useAsyncAction();

  const mutate = useCallback(
    async (pipelineId: string, stageId: string, targetStageId?: string): Promise<void | undefined> =>
      run(() => deletePipelineStage(pipelineId, stageId, targetStageId)),
    [run],
  );

  return { deletePipelineStage: mutate, pending };
}
