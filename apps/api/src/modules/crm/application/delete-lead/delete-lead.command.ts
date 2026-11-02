import type { CrmActor } from '../shared/crm-actor.js';


export type DeleteLeadCommand = {
  readonly actor: CrmActor;
  readonly leadId: string;
};
