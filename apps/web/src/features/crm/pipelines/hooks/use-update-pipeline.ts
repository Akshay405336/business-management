'use client';

import { useCallback } from 'react';
import { updatePipeline } from '../api/pipeline.api';
import type { CrmPipeline, UpdatePipelineRequest } from '../types/pipeline.types';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';

export function useUpdatePipeline() {
  const { pending, run } = useAsyncAction();

  const mutate = useCallback(
    async (id: string, body: UpdatePipelineRequest): Promise<CrmPipeline | undefined> =>
      run(() => updatePipeline(id, body)),
    [run],
  );

  return { updatePipeline: mutate, pending };
}
