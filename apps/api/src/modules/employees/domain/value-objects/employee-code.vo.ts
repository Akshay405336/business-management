import { EmployeeCodeInvalidError } from '../errors/employee.errors.js';

const EMPLOYEE_CODE_PATTERN = /^TECH-EMP-\d{4,}$/;

export class EmployeeCode {
  private constructor(readonly value: string) {}

  static fromSequence(sequence: number): EmployeeCode {
    if (!Number.isInteger(sequence) || sequence < 1) {
      throw new EmployeeCodeInvalidError();
    }
    const formatted = `TECH-EMP-${String(sequence).padStart(4, '0')}`;
    EmployeeCode.assertFormat(formatted);
    return new EmployeeCode(formatted);
  }

  static assertFormat(value: string): void {
    if (!EMPLOYEE_CODE_PATTERN.test(value)) {
      throw new EmployeeCodeInvalidError();
    }
  }
}
