import type { CrmActor } from '../shared/crm-actor.js';


export type GetProposalQuery = {
  readonly actor: CrmActor;
  readonly proposalId: string;
};
