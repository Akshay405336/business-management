import { ServicePackageValidationError } from '../errors/service-package.errors.js';

const MAX_LENGTH = 160;

export class ServicePackageName {
  private constructor(readonly value: string) {}

  static create(raw: string): ServicePackageName {
    const value = raw.trim();
    if (!value) {
      throw new ServicePackageValidationError('Enter a package name.');
    }
    if (value.length > MAX_LENGTH) {
      throw new ServicePackageValidationError(`Package name must be at most ${MAX_LENGTH} characters.`);
    }
    return new ServicePackageName(value);
  }

  static normalizeForComparison(raw: string): string {
    return raw.trim().toLowerCase();
  }
}
