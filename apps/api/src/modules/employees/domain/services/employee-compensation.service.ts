import type { EmployeeSalaryRecord } from '../types/employee.types.js';

export type EmployeeSalaryTotals = {
  readonly totalEarnings: number;
  readonly totalDeductions: number;
  readonly estimatedNetSalary: number;
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export class EmployeeCompensationService {
  static totals(record: Pick<
    EmployeeSalaryRecord,
    | 'basicSalary'
    | 'houseRentAllowance'
    | 'otherAllowances'
    | 'bonus'
    | 'otherEarnings'
    | 'providentFund'
    | 'professionalTax'
    | 'otherDeductions'
  >): EmployeeSalaryTotals {
    const totalEarnings = roundMoney(
      record.basicSalary +
        record.houseRentAllowance +
        record.otherAllowances +
        record.bonus +
        record.otherEarnings,
    );
    const totalDeductions = roundMoney(
      record.providentFund + record.professionalTax + record.otherDeductions,
    );
    return {
      totalEarnings,
      totalDeductions,
      estimatedNetSalary: roundMoney(totalEarnings - totalDeductions),
    };
  }
}
