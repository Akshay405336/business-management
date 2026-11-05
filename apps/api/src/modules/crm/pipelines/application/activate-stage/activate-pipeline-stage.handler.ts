import { Inject, Injectable } from '@nestjs/common';
import { PipelineNotFoundError } from '../../domain/errors/pipeline.errors.js';
import { PIPELINE_REPOSITORY, type PipelineRepository } from '../../domain/repositories/pipeline.repository.js';
import { pipelineStageAudit } from '../shared/pipeline-audit.js';
import { toPipelineStageReadModel } from '../shared/pipeline-result.mapper.js';
import type { ActivatePipelineStageCommand } from './activate-pipeline-stage.command.js';
import type { ActivatePipelineStageResult } from './activate-pipeline-stage.result.js';

@Injectable()
export class ActivatePipelineStageHandler {
  constructor(@Inject(PIPELINE_REPOSITORY) private readonly pipelines: PipelineRepository) {}

  async execute(command: ActivatePipelineStageCommand): Promise<ActivatePipelineStageResult> {
    const { actor, pipelineId, stageId } = command;
    const stage = await this.pipelines.getStage(actor.organizationId, pipelineId, stageId);
    if (!stage) throw new PipelineNotFoundError('Pipeline stage');
    const activated = await this.pipelines.activateStage(
      actor.organizationId,
      pipelineId,
      stageId,
      pipelineStageAudit(actor, 'STAGE_UPDATED', pipelineId, stageId),
    );
    return { stage: toPipelineStageReadModel(activated) };
  }
}
