import type { CrmActor } from '../../../../shared/application/crm-actor.js';

export interface GetQuotationQuery {
  readonly actor: CrmActor;
  readonly quotationId: string;
}
