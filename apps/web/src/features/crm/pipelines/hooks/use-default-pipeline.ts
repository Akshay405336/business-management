'use client';

import { useCallback } from 'react';
import { getDefaultPipeline } from '../api/pipeline.api';
import { pipelineKeys } from './pipeline.keys';
import { usePipelineAsyncResource } from './use-pipeline-async-resource';

export function useDefaultPipeline(enabled = true) {
  const cacheKey = JSON.stringify(pipelineKeys.default());

  const loader = useCallback(async () => getDefaultPipeline(), []);

  const { data, loading, error, refetch } = usePipelineAsyncResource(
    cacheKey,
    enabled,
    loader,
  );

  return { pipeline: data, loading, error, refetch };
}
