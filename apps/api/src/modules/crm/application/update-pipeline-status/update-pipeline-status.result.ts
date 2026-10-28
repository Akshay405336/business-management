import type { PipelineStatus } from '../../domain/crm-types.js';

export interface UpdatePipelineStatusResult {
  readonly pipelineId: string;
  readonly status: PipelineStatus;
}
