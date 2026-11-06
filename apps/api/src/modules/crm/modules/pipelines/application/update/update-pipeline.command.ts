import type { CrmActor } from '../../../../shared/application/crm-actor.js';
import type { UpdatePipelineData } from '../../domain/types/pipeline.types.js';

export type UpdatePipelineCommand = {
  readonly actor: CrmActor;
  readonly pipelineId: string;
  readonly input: UpdatePipelineData;
};
