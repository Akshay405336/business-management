'use client';

import { useCallback } from 'react';
import { createPipeline } from '../api/pipeline.api';
import type { CreatePipelineRequest, CrmPipeline } from '../types/pipeline.types';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';

export function useCreatePipeline() {
  const { pending, run } = useAsyncAction();

  const mutate = useCallback(
    async (body: CreatePipelineRequest): Promise<CrmPipeline | undefined> =>
      run(() => createPipeline(body)),
    [run],
  );

  return { createPipeline: mutate, pending };
}
