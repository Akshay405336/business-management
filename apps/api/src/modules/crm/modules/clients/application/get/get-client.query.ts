import type { CrmActor } from '../../../../shared/application/crm-actor.js';

export interface GetClientQuery {
  readonly actor: CrmActor;
  readonly clientId: string;
}
