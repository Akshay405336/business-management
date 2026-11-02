import { Inject, Injectable } from '@nestjs/common';
import {
  CRM_REPOSITORY,
  type CrmRepository,
  type PipelineRecord,
} from '../../domain/repositories/crm.repository.js';
import type { GetDefaultPipelineQuery } from './get-default-pipeline.query.js';

@Injectable()
export class GetDefaultPipelineHandler {
  constructor(@Inject(CRM_REPOSITORY) private readonly crm: CrmRepository) {}

  execute(query: GetDefaultPipelineQuery): Promise<PipelineRecord> {
    return this.crm.getDefaultPipeline(query.actor.organizationId);
  }
}
