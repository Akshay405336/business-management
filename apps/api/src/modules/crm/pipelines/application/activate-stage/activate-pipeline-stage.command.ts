import type { CrmActor } from '../../../application/shared/crm-actor.js';


export type ActivatePipelineStageCommand = {
  readonly actor: CrmActor;
  readonly pipelineId: string;
  readonly stageId: string;
};
