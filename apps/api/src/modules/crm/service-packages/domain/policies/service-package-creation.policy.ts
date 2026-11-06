import type { CreateServicePackageData } from '../types/service-package.types.js';
import { ServicePackageValidationError } from '../errors/service-package.errors.js';
import { ServicePackageName } from '../value-objects/service-package-name.vo.js';
import { ServicePackagePricingPolicy } from './service-package-pricing.policy.js';

export class ServicePackageCreationPolicy {
  static validate(input: CreateServicePackageData): CreateServicePackageData {
    ServicePackageName.create(input.name);
    ServicePackagePricingPolicy.validateCreate(input);
    if (input.deliveryDurationValue === null || input.deliveryDurationValue === undefined || input.deliveryDurationValue < 1) {
      throw new ServicePackageValidationError('Enter a delivery duration of at least 1.');
    }
    if (!input.deliveryDurationUnit) {
      throw new ServicePackageValidationError('Select a delivery duration unit.');
    }
    return input;
  }
}
