import type { PipelineStageOutcome } from '../../../../domain/enums/pipeline-stage-outcome.enum.js';
import type { PipelineStatus } from '../../../../domain/enums/pipeline-status.enum.js';
import { PipelineStage } from '../../../../domain/entities/pipeline-stage.entity.js';
import { parsePipelineStageOutcome } from '../../../../domain/enums/pipeline-stage-outcome.enum.js';
import { parsePipelineStatus } from '../../../../domain/enums/pipeline-status.enum.js';

export type PipelineStageRow = {
  id: string;
  organizationId: string;
  pipelineId: string;
  name: string;
  description: string;
  color: string;
  status: string;
  sortOrder: number;
  outcome: string;
  createdAt: Date;
  updatedAt: Date;
};

export function pipelineStageRowToDomain(row: PipelineStageRow, leadCount = 0): PipelineStage {
  return PipelineStage.reconstitute({
    id: row.id,
    organizationId: row.organizationId,
    pipelineId: row.pipelineId,
    name: row.name,
    description: row.description,
    color: row.color,
    status: parsePipelineStatus(row.status),
    sortOrder: row.sortOrder,
    outcome: parsePipelineStageOutcome(row.outcome),
    leadCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

export function pipelineStageOutcomeToPersistence(outcome: PipelineStageOutcome): PipelineStageOutcome {
  return outcome;
}

export function pipelineStageStatusToPersistence(status: PipelineStatus): PipelineStatus {
  return status;
}
