import type { ServicePackageStatus } from '../enums/service-package-status.enum.js';
import type { ServicePackageDomainEventType } from '../enums/service-package-event-type.enum.js';

export class ServicePackageStatusChangedEvent {
  readonly type: ServicePackageDomainEventType = 'SERVICE_PACKAGE_STATUS_CHANGED';

  constructor(
    readonly organizationId: string,
    readonly packageId: string,
    readonly previousStatus: ServicePackageStatus,
    readonly nextStatus: ServicePackageStatus,
    readonly occurredAt: Date = new Date(),
  ) {}
}
