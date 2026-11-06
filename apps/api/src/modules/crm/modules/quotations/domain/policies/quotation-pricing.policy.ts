import type { ServicePackageReadModel } from '../../../service-packages/domain/types/service-package-read-model.js';
import { QuotationNotFoundError, QuotationValidationError } from '../errors/quotation.errors.js';
import type { QuotationLineItemWriteInput } from '../types/quotation.types.js';

export class QuotationPricingPolicy {
  /** Line items that reference a catalog package must point at an active package in the same org. */
  static async assertReferencedPackagesActive(
    items: readonly QuotationLineItemWriteInput[],
    findPackage: (packageId: string) => Promise<ServicePackageReadModel | null>,
  ): Promise<void> {
    const cache = new Map<string, ServicePackageReadModel | null>();
    for (const item of items) {
      const packageId = item.sourcePackageId;
      if (!packageId) continue;
      if (!cache.has(packageId)) {
        cache.set(packageId, await findPackage(packageId));
      }
      const pkg = cache.get(packageId);
      if (!pkg) {
        throw new QuotationNotFoundError('Service package');
      }
      if (pkg.status !== 'ACTIVE') {
        throw new QuotationValidationError('Service package is not active.');
      }
    }
  }
}
