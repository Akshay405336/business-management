import type { ServicePackageStatus } from '../enums/service-package-status.enum.js';
import { ServicePackageValidationError } from '../errors/service-package.errors.js';

export class ServicePackageStatusPolicy {
  static assertTransition(current: ServicePackageStatus, next: ServicePackageStatus): void {
    if (current === next) {
      throw new ServicePackageValidationError(
        next === 'ACTIVE' ? 'Service package is already active.' : 'Service package is already inactive.',
      );
    }
  }
}
