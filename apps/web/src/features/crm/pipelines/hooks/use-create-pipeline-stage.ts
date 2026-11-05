'use client';

import { useCallback } from 'react';
import { createPipelineStage } from '../api/pipeline.api';
import type { CreatePipelineStageRequest, CrmPipelineStage } from '../types/pipeline.types';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';

export function useCreatePipelineStage() {
  const { pending, run } = useAsyncAction();

  const mutate = useCallback(
    async (
      pipelineId: string,
      body: CreatePipelineStageRequest,
    ): Promise<CrmPipelineStage | undefined> => run(() => createPipelineStage(pipelineId, body)),
    [run],
  );

  return { createPipelineStage: mutate, pending };
}
