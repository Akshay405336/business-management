import { EmployeeSalary } from '../value-objects/employee-salary.vo.js';
import type { EmployeeSalaryRecord } from '../types/employee.types.js';

export class EmployeeCompensationPolicy {
  static assertValid(record: EmployeeSalaryRecord): EmployeeSalaryRecord {
    return EmployeeSalary.create(record).value;
  }
}
