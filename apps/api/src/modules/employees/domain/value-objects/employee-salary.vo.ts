import { EMPLOYEE_SALARY_FREQUENCIES } from '../enums/employee-salary-frequency.enum.js';
import { EmployeeCompensationInvalidError } from '../errors/employee.errors.js';
import { EmployeeCompensationService } from '../services/employee-compensation.service.js';
import type { EmployeeSalaryRecord } from '../types/employee.types.js';

const MAX_AMOUNT = 999_999_999.99;

export class EmployeeSalary {
  private constructor(readonly value: EmployeeSalaryRecord) {}

  static create(input: EmployeeSalaryRecord): EmployeeSalary {
    const currency = input.currency.trim();
    if (currency.length !== 3) {
      throw new EmployeeCompensationInvalidError('Currency must be a 3-letter code.');
    }
    if (!EMPLOYEE_SALARY_FREQUENCIES.includes(input.frequency)) {
      throw new EmployeeCompensationInvalidError('Unsupported salary frequency.');
    }
    const amounts = [
      input.basicSalary,
      input.houseRentAllowance,
      input.otherAllowances,
      input.bonus,
      input.otherEarnings,
      input.providentFund,
      input.professionalTax,
      input.otherDeductions,
    ];
    if (amounts.some((amount) => !Number.isFinite(amount) || amount < 0 || amount > MAX_AMOUNT)) {
      throw new EmployeeCompensationInvalidError('Amount cannot be negative.');
    }
    const totals = EmployeeCompensationService.totals(input);
    if (totals.estimatedNetSalary < 0) {
      throw new EmployeeCompensationInvalidError('Total deductions cannot exceed total earnings.');
    }
    return new EmployeeSalary({ ...input, currency });
  }
}
