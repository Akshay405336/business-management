import type { ServicePackageWriteInput } from '../types/service-package.types.js';
import { ServicePackageName } from '../value-objects/service-package-name.vo.js';
import { ServicePackagePricingPolicy } from './service-package-pricing.policy.js';

export class ServicePackageUpdatePolicy {
  static validate(input: ServicePackageWriteInput): ServicePackageWriteInput {
    if (input.name !== undefined) {
      ServicePackageName.create(input.name);
    }
    ServicePackagePricingPolicy.validateWrite(input);
    return input;
  }
}
