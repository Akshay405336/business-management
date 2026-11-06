import type { CrmActor } from '../../../../shared/application/crm-actor.js';
import type { LeadListFilters } from '../../domain/types/lead.types.js';

export type ListLeadsQuery = {
  readonly actor: CrmActor;
  readonly filters: Omit<LeadListFilters, 'page' | 'pageSize'> & {
    readonly page?: number;
    readonly pageSize?: number;
  };
};
