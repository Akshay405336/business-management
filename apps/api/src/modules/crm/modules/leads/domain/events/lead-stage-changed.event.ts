import type { LeadDomainEventType } from '../enums/lead-event-type.enum.js';

export class LeadStageChangedEvent {
  readonly type: LeadDomainEventType = 'LEAD_STAGE_CHANGED';

  constructor(
    readonly organizationId: string,
    readonly leadId: string,
    readonly fromStageId: string,
    readonly toStageId: string,
    readonly occurredAt: Date = new Date(),
  ) {}
}
