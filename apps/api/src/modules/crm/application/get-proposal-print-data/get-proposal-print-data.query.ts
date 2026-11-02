import type { CrmActor } from '../shared/crm-actor.js';


export type GetProposalPrintDataQuery = {
  readonly actor: CrmActor;
  readonly proposalId: string;
};
