import type { CrmActor } from '../shared/crm-actor.js';


export type ListLeadActivitiesQuery = {
  readonly actor: CrmActor;
  readonly leadId: string;
};
