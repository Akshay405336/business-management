import type { CrmActor } from '../../../application/shared/crm-actor.js';

export interface GetClientQuery {
  readonly actor: CrmActor;
  readonly clientId: string;
}
