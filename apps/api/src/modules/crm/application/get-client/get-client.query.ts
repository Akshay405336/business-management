import type { CrmActor } from '../shared/crm-actor.js';


export type GetClientQuery = {
  readonly actor: CrmActor;
  readonly clientId: string;
};
