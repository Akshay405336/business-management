import type { ClientDomainEventType } from '../enums/client-domain-event-type.enum.js';

export class ClientDeletedEvent {
  readonly type: ClientDomainEventType = 'CLIENT_DELETED';

  constructor(
    readonly organizationId: string,
    readonly clientId: string,
    readonly occurredAt: Date = new Date(),
  ) {}
}
