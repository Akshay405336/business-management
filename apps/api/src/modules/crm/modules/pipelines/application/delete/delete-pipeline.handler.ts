import { Inject, Injectable } from '@nestjs/common';
import { PipelineNotFoundError } from '../../domain/errors/pipeline.errors.js';
import { PipelineDeletionPolicy } from '../../domain/policies/pipeline-deletion.policy.js';
import { PIPELINE_REPOSITORY, type PipelineRepository } from '../../domain/repositories/pipeline.repository.js';
import { pipelineAudit } from '../shared/pipeline-audit.js';
import type { DeletePipelineCommand } from './delete-pipeline.command.js';
import type { DeletePipelineResult } from './delete-pipeline.result.js';

@Injectable()
export class DeletePipelineHandler {
  constructor(@Inject(PIPELINE_REPOSITORY) private readonly pipelines: PipelineRepository) {}

  async execute(command: DeletePipelineCommand): Promise<DeletePipelineResult> {
    const { actor, pipelineId } = command;
    const pipeline = await this.pipelines.getPipeline(actor.organizationId, pipelineId);
    if (!pipeline) throw new PipelineNotFoundError('Pipeline');
    PipelineDeletionPolicy.assertDeletable(pipeline);
    await this.pipelines.deletePipeline(
      actor.organizationId,
      pipelineId,
      pipelineAudit(actor, 'PIPELINE_DELETED', pipelineId),
    );
    return { pipelineId };
  }
}
