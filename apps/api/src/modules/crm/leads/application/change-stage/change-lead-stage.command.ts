import type { CrmActor } from '../../../application/shared/crm-actor.js';


export type ChangeLeadStageCommand = {
  readonly actor: CrmActor;
  readonly leadId: string;
  readonly stageId: string;
  readonly beforeLeadId?: string | null;
};
