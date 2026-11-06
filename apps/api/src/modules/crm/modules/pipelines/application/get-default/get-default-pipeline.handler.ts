import { Inject, Injectable } from '@nestjs/common';
import { PIPELINE_REPOSITORY, type PipelineRepository } from '../../domain/repositories/pipeline.repository.js';
import { toPipelineReadModel } from '../shared/pipeline-result.mapper.js';
import type { GetDefaultPipelineQuery } from './get-default-pipeline.query.js';
import type { GetDefaultPipelineResult } from './get-default-pipeline.result.js';

@Injectable()
export class GetDefaultPipelineHandler {
  constructor(@Inject(PIPELINE_REPOSITORY) private readonly pipelines: PipelineRepository) {}

  async execute(query: GetDefaultPipelineQuery): Promise<GetDefaultPipelineResult> {
    const pipeline = await this.pipelines.getDefaultPipeline(query.actor.organizationId);
    return { pipeline: toPipelineReadModel(pipeline) };
  }
}
