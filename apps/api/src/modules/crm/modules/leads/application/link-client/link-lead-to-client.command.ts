import type { CrmActor } from '../../../../shared/application/crm-actor.js';

export type LinkLeadToClientCommand = {
  readonly actor: CrmActor;
  readonly leadId: string;
  readonly clientId: string;
};
