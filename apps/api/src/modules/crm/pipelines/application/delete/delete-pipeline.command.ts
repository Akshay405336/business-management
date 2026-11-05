import type { CrmActor } from '../../../application/shared/crm-actor.js';

export interface DeletePipelineCommand {
  readonly actor: CrmActor;
  readonly pipelineId: string;
}
