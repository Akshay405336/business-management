import type { CrmActor } from '../../../application/shared/crm-actor.js';


export type DeletePipelineStageCommand = {
  readonly actor: CrmActor;
  readonly pipelineId: string;
  readonly stageId: string;
  readonly targetStageId?: string;
};
