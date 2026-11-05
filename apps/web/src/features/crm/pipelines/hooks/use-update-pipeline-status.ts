'use client';

import { useCallback } from 'react';
import { updatePipeline } from '../api/pipeline.api';
import type { CrmPipeline } from '../types/pipeline.types';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';

export function useUpdatePipelineStatus() {
  const { pending, run } = useAsyncAction();

  const mutate = useCallback(
    async (id: string, status: 'ACTIVE' | 'INACTIVE'): Promise<CrmPipeline | undefined> =>
      run(() => updatePipeline(id, { status })),
    [run],
  );

  return { updatePipelineStatus: mutate, pending };
}
