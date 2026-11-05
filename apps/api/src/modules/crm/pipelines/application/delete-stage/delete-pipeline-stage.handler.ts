import { Inject, Injectable } from '@nestjs/common';
import { PipelineNotFoundError } from '../../domain/errors/pipeline.errors.js';
import { PipelineStagePolicy } from '../../domain/policies/pipeline-stage.policy.js';
import { PIPELINE_REPOSITORY, type PipelineRepository } from '../../domain/repositories/pipeline.repository.js';
import { pipelineStageAudit } from '../shared/pipeline-audit.js';
import type { DeletePipelineStageCommand } from './delete-pipeline-stage.command.js';
import type { DeletePipelineStageResult } from './delete-pipeline-stage.result.js';

@Injectable()
export class DeletePipelineStageHandler {
  constructor(@Inject(PIPELINE_REPOSITORY) private readonly pipelines: PipelineRepository) {}

  async execute(command: DeletePipelineStageCommand): Promise<DeletePipelineStageResult> {
    const { actor, pipelineId, stageId, targetStageId } = command;
    const stage = await this.pipelines.getStage(actor.organizationId, pipelineId, stageId);
    if (!stage) throw new PipelineNotFoundError('Pipeline stage');
    PipelineStagePolicy.assertCanDelete(stage, targetStageId);
    if (targetStageId) {
      const target = await this.pipelines.findActiveStage(
        actor.organizationId,
        pipelineId,
        targetStageId,
      );
      if (!target) throw new PipelineNotFoundError('Target pipeline stage');
    }
    await this.pipelines.deleteStage(
      actor.organizationId,
      pipelineId,
      stageId,
      targetStageId,
      pipelineStageAudit(actor, 'STAGE_DELETED', pipelineId, stageId),
    );
    return { pipelineId, stageId };
  }
}
