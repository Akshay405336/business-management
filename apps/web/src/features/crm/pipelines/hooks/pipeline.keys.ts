import type { PipelineListQuery } from '../api/pipeline.api';

export const pipelineKeys = {
  all: ['crm', 'pipelines'] as const,
  lists: () => [...pipelineKeys.all, 'list'] as const,
  list: (query: PipelineListQuery) => [...pipelineKeys.lists(), query] as const,
  details: () => [...pipelineKeys.all, 'detail'] as const,
  detail: (id: string) => [...pipelineKeys.details(), id] as const,
  default: () => [...pipelineKeys.all, 'default'] as const,
};
