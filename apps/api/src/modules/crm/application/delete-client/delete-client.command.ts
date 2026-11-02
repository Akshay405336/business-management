import type { CrmActor } from '../shared/crm-actor.js';


export type DeleteClientCommand = {
  readonly actor: CrmActor;
  readonly clientId: string;
};
