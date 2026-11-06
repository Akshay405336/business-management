import type { ClientDomainEventType } from '../enums/client-domain-event-type.enum.js';

export class ClientUpdatedEvent {
  readonly type: ClientDomainEventType = 'CLIENT_UPDATED';

  constructor(
    readonly organizationId: string,
    readonly clientId: string,
    readonly occurredAt: Date = new Date(),
  ) {}
}
