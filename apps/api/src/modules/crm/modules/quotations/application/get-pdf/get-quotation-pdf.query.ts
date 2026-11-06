import type { CrmActor } from '../../../../shared/application/crm-actor.js';

export interface GetQuotationPdfQuery {
  readonly actor: CrmActor;
  readonly quotationId: string;
}
