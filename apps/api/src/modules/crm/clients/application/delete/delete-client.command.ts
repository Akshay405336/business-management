import type { CrmActor } from '../../../application/shared/crm-actor.js';

export interface DeleteClientCommand {
  readonly actor: CrmActor;
  readonly clientId: string;
}
