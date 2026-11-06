import type { CrmActor } from '../../../application/shared/crm-actor.js';
import type {
  LeadPriority,
  LeadSource,
} from '../../../domain/crm-types.js';

export type CreateLeadCommand = {
  readonly actor: CrmActor;
  readonly input: {
    readonly fullName: string;
    readonly companyName?: string;
    readonly email?: string | null;
    readonly phone?: string | null;
    readonly website?: string | null;
    readonly source?: LeadSource;
    readonly pipelineId: string;
    readonly stageId?: string;
    readonly assignedAdminId?: string | null;
    readonly priority?: LeadPriority;
    readonly estimatedValue?: string | number;
    readonly currency?: string;
    readonly expectedCloseDate?: Date | null;
    readonly nextFollowUpDate?: Date | null;
    readonly description?: string;
    readonly tags?: readonly string[];
  };
};
