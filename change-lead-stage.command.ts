import type { CrmActor } from '../shared/crm-actor.js';


export type ChangeLeadStageCommand = {
  readonly actor: CrmActor;
  readonly leadId: string;
  readonly stageId: string;
  readonly beforeLeadId?: string | null;
};
