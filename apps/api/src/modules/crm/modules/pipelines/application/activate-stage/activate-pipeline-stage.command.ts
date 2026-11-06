import type { CrmActor } from '../../../../shared/application/crm-actor.js';


export type ActivatePipelineStageCommand = {
  readonly actor: CrmActor;
  readonly pipelineId: string;
  readonly stageId: string;
};
