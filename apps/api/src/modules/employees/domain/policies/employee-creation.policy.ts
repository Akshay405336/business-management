import { EmployeeValidationError } from '../errors/employee.errors.js';
import type { CreateEmployeeInput } from '../types/employee.types.js';
import { EmployeeValidationService } from '../services/employee-validation.service.js';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export class EmployeeCreationPolicy {
  static validate(input: CreateEmployeeInput): CreateEmployeeInput {
    const normalized = EmployeeValidationService.normalizeCreate(input);
    EmployeeCreationPolicy.assertDateOrder(
      normalized.dateOfJoining,
      normalized.probationEndDate,
      normalized.employmentEndDate,
    );
    return normalized;
  }

  static assertDateOrder(
    dateOfJoining: string,
    probationEndDate: string | null | undefined,
    employmentEndDate: string | null | undefined,
  ): void {
    if (!DATE_ONLY.test(dateOfJoining)) {
      throw new EmployeeValidationError('Use a valid date (YYYY-MM-DD).');
    }
    if (probationEndDate && !DATE_ONLY.test(probationEndDate)) {
      throw new EmployeeValidationError('Use a valid date (YYYY-MM-DD).');
    }
    if (employmentEndDate && !DATE_ONLY.test(employmentEndDate)) {
      throw new EmployeeValidationError('Use a valid date (YYYY-MM-DD).');
    }
    if (probationEndDate && probationEndDate < dateOfJoining) {
      throw new EmployeeValidationError(
        'Probation end date must be on or after the date of joining.',
        [
          {
            path: 'probationEndDate',
            message: 'Probation end date must be on or after the date of joining.',
          },
        ],
      );
    }
    if (employmentEndDate && employmentEndDate < dateOfJoining) {
      throw new EmployeeValidationError(
        'Employment end date must be on or after the date of joining.',
        [
          {
            path: 'employmentEndDate',
            message: 'Employment end date must be on or after the date of joining.',
          },
        ],
      );
    }
  }
}
