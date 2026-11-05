import { Inject, Injectable } from '@nestjs/common';
import { PIPELINE_REPOSITORY, type PipelineRepository } from '../../domain/repositories/pipeline.repository.js';
import { toPipelineReadModel } from '../shared/pipeline-result.mapper.js';
import type { ListPipelinesQuery } from './list-pipelines.query.js';
import type { ListPipelinesResult } from './list-pipelines.result.js';

@Injectable()
export class ListPipelinesHandler {
  constructor(@Inject(PIPELINE_REPOSITORY) private readonly pipelines: PipelineRepository) {}

  async execute(query: ListPipelinesQuery): Promise<ListPipelinesResult> {
    const pipelines = await this.pipelines.listPipelines(query.actor.organizationId, query.filters);
    return { pipelines: pipelines.map((pipeline) => toPipelineReadModel(pipeline)) };
  }
}
