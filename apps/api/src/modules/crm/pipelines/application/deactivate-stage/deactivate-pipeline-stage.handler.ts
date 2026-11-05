import { Inject, Injectable } from '@nestjs/common';
import { PipelineNotFoundError } from '../../domain/errors/pipeline.errors.js';
import { PipelineStagePolicy } from '../../domain/policies/pipeline-stage.policy.js';
import { PIPELINE_REPOSITORY, type PipelineRepository } from '../../domain/repositories/pipeline.repository.js';
import { pipelineStageAudit } from '../shared/pipeline-audit.js';
import { toPipelineStageReadModel } from '../shared/pipeline-result.mapper.js';
import type { DeactivatePipelineStageCommand } from './deactivate-pipeline-stage.command.js';
import type { DeactivatePipelineStageResult } from './deactivate-pipeline-stage.result.js';

@Injectable()
export class DeactivatePipelineStageHandler {
  constructor(@Inject(PIPELINE_REPOSITORY) private readonly pipelines: PipelineRepository) {}

  async execute(command: DeactivatePipelineStageCommand): Promise<DeactivatePipelineStageResult> {
    const { actor, pipelineId, stageId, targetStageId } = command;
    const stage = await this.pipelines.getStage(actor.organizationId, pipelineId, stageId);
    if (!stage) throw new PipelineNotFoundError('Pipeline stage');
    PipelineStagePolicy.assertCanDeactivate(stage, targetStageId);
    if (targetStageId) {
      PipelineStagePolicy.assertValidTargetStage(
        await this.pipelines.findActiveStage(actor.organizationId, pipelineId, targetStageId),
      );
    }
    const deactivated = await this.pipelines.deactivateStage(
      actor.organizationId,
      pipelineId,
      stageId,
      targetStageId,
      pipelineStageAudit(actor, 'STAGE_UPDATED', pipelineId, stageId),
    );
    return { stage: toPipelineStageReadModel(deactivated) };
  }
}
