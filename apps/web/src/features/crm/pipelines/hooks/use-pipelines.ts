'use client';

import { useCallback } from 'react';
import { listPipelines, type PipelineListQuery } from '../api/pipeline.api';
import { pipelineKeys } from './pipeline.keys';
import { usePipelineAsyncResource } from './use-pipeline-async-resource';

export type UsePipelinesOptions = {
  readonly query: PipelineListQuery;
  readonly enabled?: boolean;
};

export function usePipelines({ query, enabled = true }: UsePipelinesOptions) {
  const queryKey = JSON.stringify(query);
  const cacheKey = JSON.stringify(pipelineKeys.list(query));

  const loader = useCallback(async () => {
    const parsed = JSON.parse(queryKey) as PipelineListQuery;
    const result = await listPipelines(parsed);
    return result.pipelines;
  }, [queryKey]);

  const { data, loading, error, refetch } = usePipelineAsyncResource(
    cacheKey,
    enabled,
    loader,
  );

  return {
    pipelines: data,
    loading,
    error,
    refetch,
  };
}
