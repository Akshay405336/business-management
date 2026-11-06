import type { CrmActor } from '../../../../shared/application/crm-actor.js';


export type GetPipelineQuery = {
  readonly actor: CrmActor;
  readonly pipelineId: string;
};
