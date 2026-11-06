import type { CrmActor } from '../../../../shared/application/crm-actor.js';

export interface DeleteClientCommand {
  readonly actor: CrmActor;
  readonly clientId: string;
}
