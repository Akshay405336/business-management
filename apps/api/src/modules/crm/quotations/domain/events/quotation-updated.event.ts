import type { QuotationDomainEventType } from '../enums/quotation-domain-event-type.enum.js';

/** Domain event type only — platform outbox publishing remains deferred. */
export class QuotationUpdatedEvent {
  readonly type: QuotationDomainEventType = 'QUOTATION_UPDATED';

  constructor(
    readonly organizationId: string,
    readonly quotationId: string,
    readonly occurredAt: Date = new Date(),
  ) {}
}
