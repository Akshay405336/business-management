import { Inject, Injectable } from '@nestjs/common';
import { LEAD_REPOSITORY, type LeadRepository } from '../../domain/repositories/lead.repository.js';
import { toLeadActivityReadModel } from '../shared/lead-result.mapper.js';
import type { ListLeadActivitiesQuery } from './list-lead-activities.query.js';
import type { ListLeadActivitiesResult } from './list-lead-activities.result.js';

@Injectable()
export class ListLeadActivitiesHandler {
  constructor(@Inject(LEAD_REPOSITORY) private readonly leads: LeadRepository) {}

  async execute(query: ListLeadActivitiesQuery): Promise<ListLeadActivitiesResult> {
    const { actor, leadId } = query;
    const activities = await this.leads.listLeadActivities(actor.organizationId, leadId);
    return { activities: activities.map(toLeadActivityReadModel) };
  }
}
