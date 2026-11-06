import type { CrmActor } from '../shared/crm-actor.js';
import type { LeadListFilters } from '../../domain/repositories/crm.repository.js';

export type ListLeadsQuery = {
  readonly actor: CrmActor;
  readonly filters: Omit<LeadListFilters, 'page' | 'pageSize'> & {
    readonly page?: number;
    readonly pageSize?: number;
  };
};
