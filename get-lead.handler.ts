import { Inject, Injectable } from '@nestjs/common';
import {
  CRM_REPOSITORY,
  type CrmRepository,
  type LeadRecord,
} from '../../domain/repositories/crm.repository.js';
import { requireCrmEntity } from '../shared/require-crm-entity.js';
import type { GetLeadQuery } from './get-lead.query.js';

@Injectable()
export class GetLeadHandler {
  constructor(@Inject(CRM_REPOSITORY) private readonly crm: CrmRepository) {}

  execute(query: GetLeadQuery): Promise<LeadRecord> {
    const { actor, leadId } = query;
    return requireCrmEntity(this.crm.getLead(actor.organizationId, leadId), 'Lead');
  }
}
