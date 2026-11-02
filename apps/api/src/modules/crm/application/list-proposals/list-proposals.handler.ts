import { Inject, Injectable } from '@nestjs/common';
import {
  CRM_REPOSITORY,
  type CrmRepository,
  type PaginatedProposals,
} from '../../domain/repositories/crm.repository.js';
import type { ListProposalsQuery } from './list-proposals.query.js';

@Injectable()
export class ListProposalsHandler {
  constructor(@Inject(CRM_REPOSITORY) private readonly crm: CrmRepository) {}

  execute(query: ListProposalsQuery): Promise<PaginatedProposals> {
    const { actor, filters } = query;
    return this.crm.listProposals(actor.organizationId, filters);
  }
}
