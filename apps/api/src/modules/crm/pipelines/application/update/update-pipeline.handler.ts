import { Inject, Injectable } from '@nestjs/common';
import { Pipeline } from '../../domain/entities/pipeline.entity.js';
import { PipelineNotFoundError } from '../../domain/errors/pipeline.errors.js';
import { PipelineDomainService } from '../../domain/services/pipeline-domain.service.js';
import { PIPELINE_REPOSITORY, type PipelineRepository } from '../../domain/repositories/pipeline.repository.js';
import { pipelineAudit } from '../shared/pipeline-audit.js';
import { toPipelineReadModel } from '../shared/pipeline-result.mapper.js';
import type { UpdatePipelineCommand } from './update-pipeline.command.js';
import type { UpdatePipelineResult } from './update-pipeline.result.js';

@Injectable()
export class UpdatePipelineHandler {
  constructor(@Inject(PIPELINE_REPOSITORY) private readonly pipelines: PipelineRepository) {}

  async execute(command: UpdatePipelineCommand): Promise<UpdatePipelineResult> {
    const { actor, pipelineId, input } = command;
    const existing = await this.pipelines.getPipeline(actor.organizationId, pipelineId);
    if (!existing) throw new PipelineNotFoundError('Pipeline');
    const payload = Pipeline.validateUpdate(input);
    PipelineDomainService.prepareUpdate(existing, payload);
    const pipeline = await this.pipelines.updatePipeline(
      actor.organizationId,
      pipelineId,
      payload,
      pipelineAudit(actor, 'PIPELINE_UPDATED', pipelineId),
    );
    return { pipeline: toPipelineReadModel(pipeline) };
  }
}
