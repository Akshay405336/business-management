import { EmployeeValidationError } from '../errors/employee.errors.js';

const DUPLICATE_EMAIL = 'An employee with this work email already exists.';
const DUPLICATE_PHONE = 'An employee with this phone number already exists.';

export class EmployeeContactUniquenessPolicy {
  static assertAvailable(found: {
    readonly emailTaken: boolean;
    readonly phoneTaken: boolean;
  }): void {
    const conflicts: { path: string; message: string }[] = [];
    if (found.emailTaken) conflicts.push({ path: 'workEmail', message: DUPLICATE_EMAIL });
    if (found.phoneTaken) conflicts.push({ path: 'phone', message: DUPLICATE_PHONE });
    if (conflicts.length === 0) return;
    throw new EmployeeValidationError(
      conflicts.length === 1 ? conflicts[0]!.message : 'Update the highlighted contact fields.',
      conflicts,
    );
  }

  static duplicateEmailMessage(): string {
    return DUPLICATE_EMAIL;
  }

  static duplicatePhoneMessage(): string {
    return DUPLICATE_PHONE;
  }
}
