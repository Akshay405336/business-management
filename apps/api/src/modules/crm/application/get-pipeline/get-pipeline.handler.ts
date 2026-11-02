import { Inject, Injectable } from '@nestjs/common';
import {
  CRM_REPOSITORY,
  type CrmRepository,
  type PipelineRecord,
} from '../../domain/repositories/crm.repository.js';
import { requireCrmEntity } from '../shared/require-crm-entity.js';
import type { GetPipelineQuery } from './get-pipeline.query.js';

@Injectable()
export class GetPipelineHandler {
  constructor(@Inject(CRM_REPOSITORY) private readonly crm: CrmRepository) {}

  execute(query: GetPipelineQuery): Promise<PipelineRecord> {
    const { actor, pipelineId } = query;
    return requireCrmEntity(
      this.crm.getPipeline(actor.organizationId, pipelineId),
      'Pipeline',
    );
  }
}
