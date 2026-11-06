import type { CreateServicePackageData, ServicePackageWriteInput } from '../types/service-package.types.js';
import { ServicePackagePrice } from '../value-objects/service-package-price.vo.js';
import { ServicePackageValidationError } from '../errors/service-package.errors.js';

export class ServicePackagePricingPolicy {
  static validateCreate(input: CreateServicePackageData): void {
    ServicePackagePrice.create(input.basePrice);
    ServicePackagePrice.create(input.discountValue);
    if (input.discountType === 'PERCENT') {
      const pct = Number(input.discountValue);
      if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
        throw new ServicePackageValidationError('Enter a percentage between 0 and 100.');
      }
    }
  }

  static validateWrite(input: ServicePackageWriteInput): void {
    if (input.basePrice !== undefined) {
      ServicePackagePrice.create(input.basePrice);
    }
    if (input.discountValue !== undefined) {
      ServicePackagePrice.create(input.discountValue);
    }
  }
}
