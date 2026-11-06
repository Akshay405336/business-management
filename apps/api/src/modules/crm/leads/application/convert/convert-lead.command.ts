import type { CrmActor } from '../../../application/shared/crm-actor.js';


export type ConvertLeadCommand = {
  readonly actor: CrmActor;
  readonly leadId: string;
};
