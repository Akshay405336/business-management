import type { ServicePackageDomainEventType } from '../enums/service-package-event-type.enum.js';

export class ServicePackageDeletedEvent {
  readonly type: ServicePackageDomainEventType = 'SERVICE_PACKAGE_DELETED';

  constructor(
    readonly organizationId: string,
    readonly packageId: string,
    readonly occurredAt: Date = new Date(),
  ) {}
}
