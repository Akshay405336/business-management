import type { LeadDomainEventType } from '../enums/lead-event-type.enum.js';

/** Domain event type only — platform outbox publishing remains deferred. */
export class LeadCreatedEvent {
  readonly type: LeadDomainEventType = 'LEAD_CREATED';

  constructor(
    readonly organizationId: string,
    readonly leadId: string,
    readonly occurredAt: Date = new Date(),
  ) {}
}
