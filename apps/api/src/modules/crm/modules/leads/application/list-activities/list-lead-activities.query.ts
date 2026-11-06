import type { CrmActor } from '../../../../shared/application/crm-actor.js';


export type ListLeadActivitiesQuery = {
  readonly actor: CrmActor;
  readonly leadId: string;
};
