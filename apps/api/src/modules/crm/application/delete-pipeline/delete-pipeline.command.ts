import type { CrmActor } from '../shared/crm-actor.js';

export interface DeletePipelineCommand {
  readonly actor: CrmActor;
  readonly pipelineId: string;
}
