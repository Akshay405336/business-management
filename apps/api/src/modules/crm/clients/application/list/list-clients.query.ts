import type { CrmActor } from '../../../application/shared/crm-actor.js';
import type { ClientListFilters } from '../../domain/types/client.types.js';

export interface ListClientsQuery {
  readonly actor: CrmActor;
  readonly filters: Omit<ClientListFilters, 'page' | 'pageSize' | 'createdFrom' | 'createdTo'> & {
    readonly page?: number;
    readonly pageSize?: number;
    readonly createdFrom?: string;
    readonly createdTo?: string;
  };
}
