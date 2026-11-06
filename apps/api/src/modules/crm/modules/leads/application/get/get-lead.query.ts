import type { CrmActor } from '../../../../shared/application/crm-actor.js';


export type GetLeadQuery = {
  readonly actor: CrmActor;
  readonly leadId: string;
};
