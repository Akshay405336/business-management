import type { CrmActor } from '../shared/crm-actor.js';


export type GetPipelineQuery = {
  readonly actor: CrmActor;
  readonly pipelineId: string;
};
