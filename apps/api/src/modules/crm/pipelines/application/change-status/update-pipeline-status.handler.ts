import { Inject, Injectable } from '@nestjs/common';
import { PipelineStatusChangedEvent } from '../../domain/events/pipeline-status-changed.event.js';
import { PIPELINE_REPOSITORY, type PipelineRepository } from '../../domain/repositories/pipeline.repository.js';
import { pipelineAudit } from '../shared/pipeline-audit.js';
import type { UpdatePipelineStatusCommand } from './update-pipeline-status.command.js';
import type { UpdatePipelineStatusResult } from './update-pipeline-status.result.js';

@Injectable()
export class UpdatePipelineStatusHandler {
  constructor(@Inject(PIPELINE_REPOSITORY) private readonly pipelines: PipelineRepository) {}

  async execute(command: UpdatePipelineStatusCommand): Promise<UpdatePipelineStatusResult> {
    const { actor, pipelineId, status } = command;
    await this.pipelines.updatePipeline(
      actor.organizationId,
      pipelineId,
      { status },
      pipelineAudit(actor, 'PIPELINE_UPDATED', pipelineId),
    );
    void new PipelineStatusChangedEvent(actor.organizationId, pipelineId, status);
    return { pipelineId, status };
  }
}
