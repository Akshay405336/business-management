import { Inject, Injectable } from '@nestjs/common';
import { PipelineCreationPolicy } from '../../domain/policies/pipeline-creation.policy.js';
import { PIPELINE_REPOSITORY, type PipelineRepository } from '../../domain/repositories/pipeline.repository.js';
import { pipelineAudit } from '../shared/pipeline-audit.js';
import { toPipelineReadModel } from '../shared/pipeline-result.mapper.js';
import type { CreatePipelineCommand } from './create-pipeline.command.js';
import type { CreatePipelineResult } from './create-pipeline.result.js';

@Injectable()
export class CreatePipelineHandler {
  constructor(@Inject(PIPELINE_REPOSITORY) private readonly pipelines: PipelineRepository) {}

  async execute(command: CreatePipelineCommand): Promise<CreatePipelineResult> {
    const { actor, input } = command;
    const validated = PipelineCreationPolicy.validate(input);
    const pipeline = await this.pipelines.createPipeline(
      actor.organizationId,
      validated,
      pipelineAudit(actor, 'PIPELINE_CREATED', crypto.randomUUID(), { name: validated.name }),
    );
    return { pipeline: toPipelineReadModel(pipeline) };
  }
}
