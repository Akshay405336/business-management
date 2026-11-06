import type { CrmActor } from '../../../../shared/application/crm-actor.js';
import type { LeadActivityType } from '../../../../shared/domain/crm-types.js';

export type CreateLeadActivityCommand = {
  readonly actor: CrmActor;
  readonly leadId: string;
  readonly input: {
    readonly type: LeadActivityType;
    readonly title: string;
    readonly description?: string;
    readonly occurredAt: Date;
    readonly dueAt?: Date | null;
    readonly completedAt?: Date | null;
    readonly metadata?: unknown;
  };
};
