import type { CrmActor } from '../shared/crm-actor.js';
import type {
  LeadPriority,
  LeadSource,
} from '../../domain/crm-types.js';

export type UpdateLeadCommand = {
  readonly actor: CrmActor;
  readonly leadId: string;
  readonly input: {
    readonly subject?: string;
    readonly fullName?: string;
    readonly companyName?: string;
    readonly email?: string | null;
    readonly phone?: string | null;
    readonly website?: string | null;
    readonly source?: LeadSource;
    readonly pipelineId?: string;
    readonly stageId?: string;
    readonly assignedAdminId?: string | null;
    readonly priority?: LeadPriority;
    readonly estimatedValue?: string | number;
    readonly currency?: string;
    readonly expectedCloseDate?: Date | null;
    readonly nextFollowUpDate?: Date | null;
    readonly description?: string;
    readonly tags?: readonly string[];
    readonly archived?: boolean;
  };
};
