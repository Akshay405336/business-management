import type { CrmActor } from '../../../application/shared/crm-actor.js';


export type DeleteLeadCommand = {
  readonly actor: CrmActor;
  readonly leadId: string;
};
