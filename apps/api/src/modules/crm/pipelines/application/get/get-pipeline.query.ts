import type { CrmActor } from '../../../application/shared/crm-actor.js';


export type GetPipelineQuery = {
  readonly actor: CrmActor;
  readonly pipelineId: string;
};
