import type { CrmActor } from '../shared/crm-actor.js';


export type DeactivatePipelineStageCommand = {
  readonly actor: CrmActor;
  readonly pipelineId: string;
  readonly stageId: string;
  readonly targetStageId?: string;
};
