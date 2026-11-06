import type { CrmActor } from '../../../application/shared/crm-actor.js';

export type LinkLeadToClientCommand = {
  readonly actor: CrmActor;
  readonly leadId: string;
  readonly clientId: string;
};
