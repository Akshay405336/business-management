import { Inject, Injectable } from '@nestjs/common';
import { PipelineStageOrderService } from '../../domain/services/pipeline-stage-order.service.js';
import { PIPELINE_REPOSITORY, type PipelineRepository } from '../../domain/repositories/pipeline.repository.js';
import { pipelineAudit } from '../shared/pipeline-audit.js';
import { toPipelineStageReadModel } from '../shared/pipeline-result.mapper.js';
import type { ReorderPipelineStagesCommand } from './reorder-pipeline-stages.command.js';
import type { ReorderPipelineStagesResult } from './reorder-pipeline-stages.result.js';

@Injectable()
export class ReorderPipelineStagesHandler {
  constructor(@Inject(PIPELINE_REPOSITORY) private readonly pipelines: PipelineRepository) {}

  async execute(command: ReorderPipelineStagesCommand): Promise<ReorderPipelineStagesResult> {
    const { actor, pipelineId, orderedStageIds } = command;
    const activeIds = await this.pipelines.listActiveStageIds(actor.organizationId, pipelineId);
    PipelineStageOrderService.validateActiveReorder(activeIds, orderedStageIds);
    const stages = await this.pipelines.reorderStages(
      actor.organizationId,
      pipelineId,
      orderedStageIds,
      pipelineAudit(actor, 'STAGE_REORDERED', pipelineId),
    );
    return { stages: stages.map((stage) => toPipelineStageReadModel(stage)) };
  }
}
