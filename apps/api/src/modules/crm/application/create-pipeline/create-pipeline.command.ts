import type { CrmActor } from '../shared/crm-actor.js';
import type { CreatePipelineInput } from '../../domain/repositories/crm.repository.js';

export type CreatePipelineCommand = {
  readonly actor: CrmActor;
  readonly input: CreatePipelineInput;
};
