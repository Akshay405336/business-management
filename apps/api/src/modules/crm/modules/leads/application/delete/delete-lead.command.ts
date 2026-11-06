import type { CrmActor } from '../../../../shared/application/crm-actor.js';


export type DeleteLeadCommand = {
  readonly actor: CrmActor;
  readonly leadId: string;
};
