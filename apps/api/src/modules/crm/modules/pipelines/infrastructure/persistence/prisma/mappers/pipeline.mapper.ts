import { Pipeline } from '../../../../domain/entities/pipeline.entity.js';
import { parsePipelineStatus } from '../../../../domain/enums/pipeline-status.enum.js';
import { pipelineStageRowToDomain, type PipelineStageRow } from './pipeline-stage.mapper.js';

export type PipelineRow = {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  status: string;
  isDefault: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  stages?: Array<PipelineStageRow & { _count?: { leads: number } }>;
  _count?: { leads: number };
};

export function pipelineRowToDomain(row: PipelineRow): Pipeline {
  const stages =
    row.stages?.map((stage) =>
      pipelineStageRowToDomain(stage, stage._count?.leads ?? 0),
    ) ?? [];
  return Pipeline.reconstitute({
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    description: row.description,
    status: parsePipelineStatus(row.status),
    isDefault: row.isDefault,
    sortOrder: row.sortOrder,
    leadCount: row._count?.leads ?? 0,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    stages: stages.map((stage) => stage.toReadModel()),
  });
}
