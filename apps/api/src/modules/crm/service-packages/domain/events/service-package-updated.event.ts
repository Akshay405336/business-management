import type { ServicePackageDomainEventType } from '../enums/service-package-event-type.enum.js';

export class ServicePackageUpdatedEvent {
  readonly type: ServicePackageDomainEventType = 'SERVICE_PACKAGE_UPDATED';

  constructor(
    readonly organizationId: string,
    readonly packageId: string,
    readonly occurredAt: Date = new Date(),
  ) {}
}
