import { Inject, Injectable } from '@nestjs/common';
import {
  CRM_REPOSITORY,
  type CrmRepository,
  type PipelineRecord,
} from '../../domain/repositories/crm.repository.js';
import type { ListPipelinesQuery } from './list-pipelines.query.js';

@Injectable()
export class ListPipelinesHandler {
  constructor(@Inject(CRM_REPOSITORY) private readonly crm: CrmRepository) {}

  execute(query: ListPipelinesQuery): Promise<readonly PipelineRecord[]> {
    return this.crm.listPipelines(query.actor.organizationId, query.filters);
  }
}
