import { Inject, Injectable } from '@nestjs/common';
import {
  CRM_REPOSITORY,
  type CrmRepository,
  type LeadActivityRecord,
} from '../../domain/repositories/crm.repository.js';
import type { ListLeadActivitiesQuery } from './list-lead-activities.query.js';

@Injectable()
export class ListLeadActivitiesHandler {
  constructor(@Inject(CRM_REPOSITORY) private readonly crm: CrmRepository) {}

  execute(query: ListLeadActivitiesQuery): Promise<readonly LeadActivityRecord[]> {
    const { actor, leadId } = query;
    return this.crm.listLeadActivities(actor.organizationId, leadId);
  }
}
