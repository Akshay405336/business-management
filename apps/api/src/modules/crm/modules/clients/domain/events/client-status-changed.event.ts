import type { ClientDomainEventType } from '../enums/client-domain-event-type.enum.js';
import type { ClientStatus } from '../enums/client-status.enum.js';

export class ClientStatusChangedEvent {
  readonly type: ClientDomainEventType = 'CLIENT_STATUS_CHANGED';

  constructor(
    readonly organizationId: string,
    readonly clientId: string,
    readonly fromStatus: ClientStatus,
    readonly toStatus: ClientStatus,
    readonly occurredAt: Date = new Date(),
  ) {}
}
