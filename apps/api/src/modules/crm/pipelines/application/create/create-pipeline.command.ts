import type { CrmActor } from '../../../application/shared/crm-actor.js';
import type { CreatePipelineData } from '../../domain/types/pipeline.types.js';

export type CreatePipelineCommand = {
  readonly actor: CrmActor;
  readonly input: CreatePipelineData;
};
