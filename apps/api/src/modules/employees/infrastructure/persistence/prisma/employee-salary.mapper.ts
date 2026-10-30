import type { Prisma } from '../../../../../generated/prisma/client.js';
import type {
  EmployeeSalaryRecord,
} from '../../../domain/repositories/employee.repository.js';

type SalaryRow = Prisma.EmployeeSalaryStructureGetPayload<object>;

export function decimalToNumber(value: Prisma.Decimal): number {
  return Number(value.toString());
}

export function toSalaryRecord(row: SalaryRow | null): EmployeeSalaryRecord | null {
  if (!row) return null;
  return {
    currency: row.currency,
    frequency: row.frequency,
    basicSalary: decimalToNumber(row.basicSalary),
    houseRentAllowance: decimalToNumber(row.houseRentAllowance),
    otherAllowances: decimalToNumber(row.otherAllowances),
    bonus: decimalToNumber(row.bonus),
    otherEarnings: decimalToNumber(row.otherEarnings),
    providentFund: decimalToNumber(row.providentFund),
    professionalTax: decimalToNumber(row.professionalTax),
    otherDeductions: decimalToNumber(row.otherDeductions),
  };
}

export function salaryCreateData(
  organizationId: string,
  employeeId: string,
  salaryId: string,
  input: EmployeeSalaryRecord,
): Prisma.EmployeeSalaryStructureCreateInput {
  return {
    id: salaryId,
    organization: { connect: { id: organizationId } },
    employee: { connect: { id: employeeId } },
    currency: input.currency,
    frequency: input.frequency,
    basicSalary: input.basicSalary,
    houseRentAllowance: input.houseRentAllowance,
    otherAllowances: input.otherAllowances,
    bonus: input.bonus,
    otherEarnings: input.otherEarnings,
    providentFund: input.providentFund,
    professionalTax: input.professionalTax,
    otherDeductions: input.otherDeductions,
  };
}

export function salaryUpdateData(input: EmployeeSalaryRecord): Prisma.EmployeeSalaryStructureUpdateInput {
  return {
    currency: input.currency,
    frequency: input.frequency,
    basicSalary: input.basicSalary,
    houseRentAllowance: input.houseRentAllowance,
    otherAllowances: input.otherAllowances,
    bonus: input.bonus,
    otherEarnings: input.otherEarnings,
    providentFund: input.providentFund,
    professionalTax: input.professionalTax,
    otherDeductions: input.otherDeductions,
  };
}
