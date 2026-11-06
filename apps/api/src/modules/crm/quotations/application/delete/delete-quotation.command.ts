import type { CrmActor } from '../../../application/shared/crm-actor.js';

export interface DeleteQuotationCommand {
  readonly actor: CrmActor;
  readonly quotationId: string;
}
