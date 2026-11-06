import { ServicePackageConflictError } from '../errors/service-package.errors.js';

export class ServicePackageDeletionPolicy {
  static assertCanDelete(quotationReferenceCount: number): void {
    if (quotationReferenceCount > 0) {
      throw new ServicePackageConflictError(
        'This service package cannot be deleted while it is referenced by quotations.',
      );
    }
  }
}
