import { EMPLOYEE_EMPLOYMENT_STATUSES } from '../enums/employee-employment-status.enum.js';
import type { EmployeeEmploymentStatus } from '../enums/employee-employment-status.enum.js';
import { EmployeeStatusTransitionInvalidError } from '../errors/employee.errors.js';

const ACCESS_KEEPING: readonly EmployeeEmploymentStatus[] = ['ACTIVE', 'ON_LEAVE'];

export class EmployeeStatusPolicy {
  /**
   * Every recorded status may move to any other recorded status, including staying put.
   * Sign-in access stays available for ACTIVE and ON_LEAVE and is revoked otherwise.
   */
  static assertTransition(
    current: EmployeeEmploymentStatus,
    next: EmployeeEmploymentStatus,
  ): void {
    if (
      !EMPLOYEE_EMPLOYMENT_STATUSES.includes(current) ||
      !EMPLOYEE_EMPLOYMENT_STATUSES.includes(next)
    ) {
      throw new EmployeeStatusTransitionInvalidError();
    }
  }

  static retainsSignInAccess(status: EmployeeEmploymentStatus): boolean {
    return ACCESS_KEEPING.includes(status);
  }

  static accessKeepingStatuses(): readonly EmployeeEmploymentStatus[] {
    return ACCESS_KEEPING;
  }

  /** Task pickers and assignment lists include active employees only. */
  static assignableStatus(): EmployeeEmploymentStatus {
    return 'ACTIVE';
  }
}
