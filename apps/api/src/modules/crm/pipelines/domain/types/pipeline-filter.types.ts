import type { PipelineStatus } from '../enums/pipeline-status.enum.js';

export type PipelineListFilters = {
  readonly search?: string;
  readonly status?: PipelineStatus;
};
