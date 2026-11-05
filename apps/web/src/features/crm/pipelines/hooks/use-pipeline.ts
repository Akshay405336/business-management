'use client';

import { useCallback } from 'react';
import { getPipeline } from '../api/pipeline.api';
import { usePipelineAsyncResource } from './use-pipeline-async-resource';

export function usePipeline(pipelineId: string | null, enabled = true) {
  const active = Boolean(pipelineId && enabled);
  const cacheKey = active ? `pipeline:${pipelineId}` : 'pipeline:none';

  const loader = useCallback(async () => {
    if (!pipelineId) throw new Error('Pipeline id is required.');
    return getPipeline(pipelineId);
  }, [pipelineId]);

  const { data, loading, error, refetch } = usePipelineAsyncResource(
    cacheKey,
    active,
    loader,
  );

  return { pipeline: data, loading, error, refetch };
}
