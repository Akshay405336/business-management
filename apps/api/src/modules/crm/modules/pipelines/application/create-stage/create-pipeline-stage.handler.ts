import { Inject, Injectable } from '@nestjs/common';
import { PipelineStageName } from '../../domain/value-objects/pipeline-stage-name.vo.js';
import { PipelineNotFoundError, PipelineValidationError } from '../../domain/errors/pipeline.errors.js';
import { PIPELINE_REPOSITORY, type PipelineRepository } from '../../domain/repositories/pipeline.repository.js';
import { pipelineStageAudit } from '../shared/pipeline-audit.js';
import { toPipelineStageReadModel } from '../shared/pipeline-result.mapper.js';
import type { CreatePipelineStageCommand } from './create-pipeline-stage.command.js';
import type { CreatePipelineStageResult } from './create-pipeline-stage.result.js';

@Injectable()
export class CreatePipelineStageHandler {
  constructor(@Inject(PIPELINE_REPOSITORY) private readonly pipelines: PipelineRepository) {}

  async execute(command: CreatePipelineStageCommand): Promise<CreatePipelineStageResult> {
    const { actor, pipelineId, input } = command;
    PipelineStageName.create(input.name);
    const pipeline = await this.pipelines.getPipeline(actor.organizationId, pipelineId);
    if (!pipeline) throw new PipelineNotFoundError('Pipeline');
    if (await this.pipelines.stageExistsByName(actor.organizationId, pipelineId, input.name)) {
      throw new PipelineValidationError('A stage with this name already exists in the pipeline.');
    }
    const stageId = crypto.randomUUID();
    const stage = await this.pipelines.createStage(
      actor.organizationId,
      pipelineId,
      input,
      pipelineStageAudit(actor, 'STAGE_CREATED', pipelineId, stageId),
    );
    return { stage: toPipelineStageReadModel(stage) };
  }
}
