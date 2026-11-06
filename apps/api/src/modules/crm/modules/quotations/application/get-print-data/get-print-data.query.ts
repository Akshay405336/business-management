import type { CrmActor } from '../../../../shared/application/crm-actor.js';

export interface GetPrintDataQuery {
  readonly actor: CrmActor;
  readonly quotationId: string;
}
