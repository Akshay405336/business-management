import type { CrmActor } from '../shared/crm-actor.js';
import type { UpdatePipelineInput } from '../../domain/repositories/crm.repository.js';

export type UpdatePipelineCommand = {
  readonly actor: CrmActor;
  readonly pipelineId: string;
  readonly input: UpdatePipelineInput;
};
