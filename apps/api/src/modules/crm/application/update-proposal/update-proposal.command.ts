import type { CrmActor } from '../shared/crm-actor.js';
import type { UpdateProposalInput } from '../../domain/repositories/crm.repository.js';

export type UpdateProposalCommand = {
  readonly actor: CrmActor;
  readonly proposalId: string;
  readonly input: UpdateProposalInput;
};
