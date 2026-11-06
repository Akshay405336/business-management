import type { CrmActor } from '../../../application/shared/crm-actor.js';


export type ListLeadActivitiesQuery = {
  readonly actor: CrmActor;
  readonly leadId: string;
};
