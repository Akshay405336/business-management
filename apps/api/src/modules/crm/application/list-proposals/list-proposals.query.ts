import type { CrmActor } from '../shared/crm-actor.js';
import type { ProposalListFilters } from '../../domain/repositories/crm.repository.js';

export type ListProposalsQuery = {
  readonly actor: CrmActor;
  readonly filters: ProposalListFilters;
};
