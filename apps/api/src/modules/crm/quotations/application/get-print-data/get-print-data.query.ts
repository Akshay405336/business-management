import type { CrmActor } from '../../../application/shared/crm-actor.js';

export interface GetPrintDataQuery {
  readonly actor: CrmActor;
  readonly quotationId: string;
}
