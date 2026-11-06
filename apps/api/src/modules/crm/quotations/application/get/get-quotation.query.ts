import type { CrmActor } from '../../../application/shared/crm-actor.js';

export interface GetQuotationQuery {
  readonly actor: CrmActor;
  readonly quotationId: string;
}
