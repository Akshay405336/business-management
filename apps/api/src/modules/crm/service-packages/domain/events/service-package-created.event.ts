import type { ServicePackageDomainEventType } from '../enums/service-package-event-type.enum.js';

export class ServicePackageCreatedEvent {
  readonly type: ServicePackageDomainEventType = 'SERVICE_PACKAGE_CREATED';

  constructor(
    readonly organizationId: string,
    readonly packageId: string,
    readonly occurredAt: Date = new Date(),
  ) {}
}
