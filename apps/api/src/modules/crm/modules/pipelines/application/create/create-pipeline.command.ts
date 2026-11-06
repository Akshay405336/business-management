import type { CrmActor } from '../../../../shared/application/crm-actor.js';
import type { CreatePipelineData } from '../../domain/types/pipeline.types.js';

export type CreatePipelineCommand = {
  readonly actor: CrmActor;
  readonly input: CreatePipelineData;
};
