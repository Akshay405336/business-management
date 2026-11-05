import type { CrmAuditEventType } from '../../../domain/crm-types.js';
import type { PipelineStageOutcome } from '../enums/pipeline-stage-outcome.enum.js';
import type { PipelineStatus } from '../enums/pipeline-status.enum.js';

export type PipelineStageInput = {
  readonly id?: string;
  readonly name: string;
  readonly color: string;
};

export type CreatePipelineData = {
  readonly name: string;
  readonly description?: string;
  readonly status?: PipelineStatus;
  readonly stages: readonly PipelineStageInput[];
};

export type UpdatePipelineData = {
  readonly name?: string;
  readonly description?: string;
  readonly status?: PipelineStatus;
  readonly sortOrder?: number;
  readonly stages?: readonly PipelineStageInput[];
};

export type CreateStageData = {
  readonly name: string;
  readonly description?: string;
  readonly color?: string;
  readonly status?: PipelineStatus;
  readonly outcome?: PipelineStageOutcome;
};

export type UpdateStageData = {
  readonly name?: string;
  readonly description?: string;
  readonly color?: string;
  readonly status?: PipelineStatus;
  readonly outcome?: PipelineStageOutcome;
};

export type PipelineAuditMetadata = Readonly<Record<string, string | number | boolean | null>>;

export type PipelineAuditEntry = {
  readonly type: CrmAuditEventType;
  readonly adminId: string | null;
  readonly entityType: string;
  readonly entityId: string;
  readonly metadata?: PipelineAuditMetadata;
};
