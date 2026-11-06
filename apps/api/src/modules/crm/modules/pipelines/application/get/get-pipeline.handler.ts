import { Inject, Injectable } from '@nestjs/common';
import { PipelineNotFoundError } from '../../domain/errors/pipeline.errors.js';
import { PIPELINE_REPOSITORY, type PipelineRepository } from '../../domain/repositories/pipeline.repository.js';
import { toPipelineReadModel } from '../shared/pipeline-result.mapper.js';
import type { GetPipelineQuery } from './get-pipeline.query.js';
import type { GetPipelineResult } from './get-pipeline.result.js';

@Injectable()
export class GetPipelineHandler {
  constructor(@Inject(PIPELINE_REPOSITORY) private readonly pipelines: PipelineRepository) {}

  async execute(query: GetPipelineQuery): Promise<GetPipelineResult> {
    const { actor, pipelineId } = query;
    const pipeline = await this.pipelines.getPipeline(actor.organizationId, pipelineId);
    if (!pipeline) throw new PipelineNotFoundError('Pipeline');
    return { pipeline: toPipelineReadModel(pipeline) };
  }
}
