import type { PipelineStageOutcome } from '../enums/pipeline-stage-outcome.enum.js';
import type { PipelineStatus } from '../enums/pipeline-status.enum.js';

export type PipelineStageReadModel = {
  readonly id: string;
  readonly organizationId: string;
  readonly pipelineId: string;
  readonly name: string;
  readonly description: string;
  readonly color: string;
  readonly status: PipelineStatus;
  readonly sortOrder: number;
  readonly outcome: PipelineStageOutcome;
  readonly leadCount: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type PipelineReadModel = {
  readonly id: string;
  readonly organizationId: string;
  readonly name: string;
  readonly description: string;
  readonly status: PipelineStatus;
  readonly isDefault: boolean;
  readonly sortOrder: number;
  readonly leadCount: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly stages: readonly PipelineStageReadModel[];
};
