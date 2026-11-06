import type { CrmActor } from '../../../../shared/application/crm-actor.js';


export type ConvertLeadCommand = {
  readonly actor: CrmActor;
  readonly leadId: string;
};
