import { Inject, Injectable } from '@nestjs/common';
import {
  CRM_REPOSITORY,
  type CrmRepository,
  type PaginatedLeads,
} from '../../domain/repositories/crm.repository.js';
import type { ListLeadsQuery } from './list-leads.query.js';

@Injectable()
export class ListLeadsHandler {
  constructor(@Inject(CRM_REPOSITORY) private readonly crm: CrmRepository) {}

  execute(query: ListLeadsQuery): Promise<PaginatedLeads> {
    const { actor, filters } = query;
    return this.crm.listLeads(actor.organizationId, {
      ...filters,
      page: filters.page ?? 1,
      pageSize: filters.pageSize ?? 25,
    });
  }
}
