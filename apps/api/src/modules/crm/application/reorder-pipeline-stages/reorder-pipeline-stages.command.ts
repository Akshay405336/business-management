import type { CrmActor } from '../shared/crm-actor.js';


export type ReorderPipelineStagesCommand = {
  readonly actor: CrmActor;
  readonly pipelineId: string;
  readonly orderedStageIds: readonly string[];
};
