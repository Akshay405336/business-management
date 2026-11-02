import type { CrmActor } from '../shared/crm-actor.js';
import type { CreateProposalInput } from '../../domain/repositories/crm.repository.js';

export type CreateProposalCommand = {
  readonly actor: CrmActor;
  readonly input: CreateProposalInput;
};
