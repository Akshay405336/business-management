import type { CrmActor } from '../shared/crm-actor.js';


export type GetLeadQuery = {
  readonly actor: CrmActor;
  readonly leadId: string;
};
