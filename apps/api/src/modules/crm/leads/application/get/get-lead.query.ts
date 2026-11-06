import type { CrmActor } from '../../../application/shared/crm-actor.js';


export type GetLeadQuery = {
  readonly actor: CrmActor;
  readonly leadId: string;
};
