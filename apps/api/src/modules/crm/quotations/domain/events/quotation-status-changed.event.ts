import type { QuotationDomainEventType } from '../enums/quotation-domain-event-type.enum.js';
import type { QuotationStatus } from '../enums/quotation-status.enum.js';

/** Domain event type only — platform outbox publishing remains deferred. */
export class QuotationStatusChangedEvent {
  readonly type: QuotationDomainEventType = 'QUOTATION_STATUS_CHANGED';

  constructor(
    readonly organizationId: string,
    readonly quotationId: string,
    readonly fromStatus: QuotationStatus,
    readonly toStatus: QuotationStatus,
    readonly occurredAt: Date = new Date(),
  ) {}
}
