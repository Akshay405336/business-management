import type { CrmActor } from '../../../../shared/application/crm-actor.js';

export interface DeletePipelineCommand {
  readonly actor: CrmActor;
  readonly pipelineId: string;
}
