import type { CrmActor } from '../shared/crm-actor.js';


export type ConvertLeadCommand = {
  readonly actor: CrmActor;
  readonly leadId: string;
};
