import { EmployeeValidationError } from '../errors/employee.errors.js';

const STORED_MOBILE = /^[6-9]\d{9}$/;

/** Canonical stored mobile. Empty input stays empty instead of being invented. */
export class EmployeePhone {
  static normalize(raw: string | null | undefined): string | null {
    if (raw === null || raw === undefined) return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;
    return EmployeePhone.toStoredDigits(trimmed);
  }

  static require(raw: string, path: string): string {
    const stored = EmployeePhone.normalize(raw);
    if (!stored || !STORED_MOBILE.test(stored)) {
      throw new EmployeeValidationError('Enter a valid phone number.', [
        { path, message: 'Enter a valid phone number.' },
      ]);
    }
    return stored;
  }

  static optional(raw: string | null | undefined, path: string): string | null {
    if (raw === null || raw === undefined) return null;
    if (!raw.trim()) return null;
    return EmployeePhone.require(raw, path);
  }

  /** Same digit rules as the shared contact normalizer: drop +91 or a leading 0. */
  private static toStoredDigits(phone: string): string {
    let digits = phone.trim().replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) {
      digits = digits.slice(2);
    } else if (digits.length === 11 && digits.startsWith('0')) {
      digits = digits.slice(1);
    }
    return digits;
  }
}
