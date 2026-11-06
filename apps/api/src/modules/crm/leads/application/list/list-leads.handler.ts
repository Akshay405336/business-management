import { Inject, Injectable } from '@nestjs/common';
import { LEAD_REPOSITORY, type LeadRepository } from '../../domain/repositories/lead.repository.js';
import { enrichLeadReadModel, toLeadReadModel } from '../shared/lead-result.mapper.js';
import type { ListLeadsQuery } from './list-leads.query.js';
import type { ListLeadsResult } from './list-leads.result.js';

@Injectable()
export class ListLeadsHandler {
  constructor(@Inject(LEAD_REPOSITORY) private readonly leads: LeadRepository) {}

  async execute(query: ListLeadsQuery): Promise<ListLeadsResult> {
    const { actor, filters } = query;
    const page = await this.leads.listLeads(actor.organizationId, {
      ...filters,
      page: filters.page ?? 1,
      pageSize: filters.pageSize ?? 25,
    });
    const readModels = page.items.map(toLeadReadModel);
    const tagMap = await this.leads.loadTagsByLeadIds(
      actor.organizationId,
      readModels.map((lead) => lead.id),
    );
    return {
      items: readModels.map((lead) =>
        enrichLeadReadModel(lead, tagMap.get(lead.id) ?? []),
      ),
      total: page.total,
      page: page.page,
      pageSize: page.pageSize,
    };
  }
}
