import type { CrmActor } from '../../../application/shared/crm-actor.js';
import type { QuotationListFilters } from '../../domain/types/quotation.types.js';

export interface ListQuotationsQuery {
  readonly actor: CrmActor;
  readonly filters: QuotationListFilters;
}
