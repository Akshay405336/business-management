import type { CrmActor } from '../crm-actor.js';

export interface DeletePipelineCommand {
  readonly actor: CrmActor;
  readonly pipelineId: string;
}
