import type { CrmActor } from '../shared/crm-actor.js';


export type DeleteProposalCommand = {
  readonly actor: CrmActor;
  readonly proposalId: string;
};
