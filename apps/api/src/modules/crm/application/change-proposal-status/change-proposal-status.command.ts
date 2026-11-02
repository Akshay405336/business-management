import type { CrmActor } from '../shared/crm-actor.js';
import type { ProposalStatus } from '../../domain/crm-types.js';

export type ChangeProposalStatusCommand = {
  readonly actor: CrmActor;
  readonly proposalId: string;
  readonly toStatus: ProposalStatus;
  readonly note?: string;
};
