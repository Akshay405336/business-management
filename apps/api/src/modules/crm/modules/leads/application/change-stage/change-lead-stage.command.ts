import type { CrmActor } from '../../../../shared/application/crm-actor.js';


export type ChangeLeadStageCommand = {
  readonly actor: CrmActor;
  readonly leadId: string;
  readonly stageId: string;
  readonly beforeLeadId?: string | null;
};
