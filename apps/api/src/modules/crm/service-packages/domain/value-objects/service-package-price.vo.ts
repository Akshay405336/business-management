import { normalizeMoneyInput } from '@techwin/validation';
import { ServicePackageValidationError } from '../errors/service-package.errors.js';

export class ServicePackagePrice {
  private constructor(readonly amount: string) {}

  static create(raw: string | number): ServicePackagePrice {
    const parsed = normalizeMoneyInput(typeof raw === 'number' ? String(raw) : raw);
    if (!parsed.success) {
      throw new ServicePackageValidationError(parsed.error);
    }
    const value = Number(parsed.value);
    if (!Number.isFinite(value) || value < 0) {
      throw new ServicePackageValidationError('Enter a valid price of zero or greater.');
    }
    return new ServicePackagePrice(parsed.value);
  }
}
