import type { ClientDomainEventType } from '../enums/client-domain-event-type.enum.js';

export class ClientCreatedEvent {
  readonly type: ClientDomainEventType = 'CLIENT_CREATED';

  constructor(
    readonly organizationId: string,
    readonly clientId: string,
    readonly occurredAt: Date = new Date(),
  ) {}
}
