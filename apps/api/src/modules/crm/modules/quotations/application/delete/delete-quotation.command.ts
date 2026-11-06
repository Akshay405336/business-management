import type { CrmActor } from '../../../../shared/application/crm-actor.js';

export interface DeleteQuotationCommand {
  readonly actor: CrmActor;
  readonly quotationId: string;
}
