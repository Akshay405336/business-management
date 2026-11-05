'use client';

import { useCallback } from 'react';
import { deletePipeline } from '../api/pipeline.api';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';

export function useDeletePipeline() {
  const { pending, run } = useAsyncAction();

  const mutate = useCallback(
    async (id: string): Promise<void | undefined> => run(() => deletePipeline(id)),
    [run],
  );

  return { deletePipeline: mutate, pending };
}
