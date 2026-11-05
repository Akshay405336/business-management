import type { PipelineStatus } from '../../domain/enums/pipeline-status.enum.js';

export interface UpdatePipelineStatusResult {
  readonly pipelineId: string;
  readonly status: PipelineStatus;
}
