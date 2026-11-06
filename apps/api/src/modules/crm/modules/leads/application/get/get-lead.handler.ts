import { Inject, Injectable } from '@nestjs/common';
import { LEAD_REPOSITORY, type LeadRepository } from '../../domain/repositories/lead.repository.js';
import { requireCrmEntity } from '../../../../shared/application/require-crm-entity.js';
import { enrichLeadReadModel, toLeadReadModel } from '../shared/lead-result.mapper.js';
import type { GetLeadQuery } from './get-lead.query.js';
import type { GetLeadResult } from './get-lead.result.js';

@Injectable()
export class GetLeadHandler {
  constructor(@Inject(LEAD_REPOSITORY) private readonly leads: LeadRepository) {}

  async execute(query: GetLeadQuery): Promise<GetLeadResult> {
    const { actor, leadId } = query;
    const lead = await requireCrmEntity(this.leads.getLead(actor.organizationId, leadId), 'Lead');
    const readModel = toLeadReadModel(lead);
    const tagMap = await this.leads.loadTagsByLeadIds(actor.organizationId, [leadId]);
    return { lead: enrichLeadReadModel(readModel, tagMap.get(leadId) ?? []) };
  }
}
