import { Inject, Injectable } from '@nestjs/common';
import { PipelineNotFoundError } from '../../domain/errors/pipeline.errors.js';
import { PipelineStageValidationService } from '../../domain/services/pipeline-stage-validation.service.js';
import { PIPELINE_REPOSITORY, type PipelineRepository } from '../../domain/repositories/pipeline.repository.js';
import { pipelineStageAudit } from '../shared/pipeline-audit.js';
import { toPipelineStageReadModel } from '../shared/pipeline-result.mapper.js';
import type { UpdatePipelineStageCommand } from './update-pipeline-stage.command.js';
import type { UpdatePipelineStageResult } from './update-pipeline-stage.result.js';

@Injectable()
export class UpdatePipelineStageHandler {
  constructor(@Inject(PIPELINE_REPOSITORY) private readonly pipelines: PipelineRepository) {}

  async execute(command: UpdatePipelineStageCommand): Promise<UpdatePipelineStageResult> {
    const { actor, pipelineId, stageId, input } = command;
    const existing = await this.pipelines.getStage(actor.organizationId, pipelineId, stageId);
    if (!existing) throw new PipelineNotFoundError('Pipeline stage');
    if (input.status !== undefined && input.status !== existing.status) {
      PipelineStageValidationService.assertStatusChangeViaLifecycle();
    }
    const stage = await this.pipelines.updateStage(
      actor.organizationId,
      pipelineId,
      stageId,
      input,
      pipelineStageAudit(actor, 'STAGE_UPDATED', pipelineId, stageId),
    );
    return { stage: toPipelineStageReadModel(stage) };
  }
}
