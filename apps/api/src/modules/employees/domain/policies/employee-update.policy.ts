import type { UpdateEmployeeInput } from '../types/employee.types.js';
import { EmployeeCreationPolicy } from './employee-creation.policy.js';
import { EmployeeValidationService } from '../services/employee-validation.service.js';

export class EmployeeUpdatePolicy {
  /**
   * Employee code, organization, linked account ownership, and created-by stay unchanged.
   * Date order is checked only when the patch itself carries both dates, matching the
   * current update request contract.
   */
  static validate(input: UpdateEmployeeInput): UpdateEmployeeInput {
    const normalized = EmployeeValidationService.normalizeUpdate(input);
    if (normalized.dateOfJoining && (normalized.probationEndDate || normalized.employmentEndDate)) {
      EmployeeCreationPolicy.assertDateOrder(
        normalized.dateOfJoining,
        normalized.probationEndDate,
        normalized.employmentEndDate,
      );
    } else if (normalized.dateOfJoining) {
      EmployeeCreationPolicy.assertDateOrder(normalized.dateOfJoining, null, null);
    }
    return normalized;
  }
}
