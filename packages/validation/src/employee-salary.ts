import { z } from 'zod';

export const employeeSalaryFrequencySchema = z.enum(['MONTHLY', 'ANNUAL']);

export const moneyAmountSchema = z
  .number()
  .finite()
  .min(0, 'Amount cannot be negative.')
  .max(999_999_999.99);

export const employeeSalaryStructureSchema = z
  .object({
    currency: z.string().trim().min(3).max(3).default('INR'),
    frequency: employeeSalaryFrequencySchema.default('MONTHLY'),
    basicSalary: moneyAmountSchema.default(0),
    houseRentAllowance: moneyAmountSchema.default(0),
    otherAllowances: moneyAmountSchema.default(0),
    bonus: moneyAmountSchema.default(0),
    otherEarnings: moneyAmountSchema.default(0),
    providentFund: moneyAmountSchema.default(0),
    professionalTax: moneyAmountSchema.default(0),
    otherDeductions: moneyAmountSchema.default(0),
  })
  .strict()
  .superRefine((value, ctx) => {
    const totals = computeEmployeeSalaryTotals(value);
    if (totals.estimatedNetSalary < 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['otherDeductions'],
        message: 'Total deductions cannot exceed total earnings.',
      });
    }
  });

export type EmployeeSalaryStructureInput = z.infer<typeof employeeSalaryStructureSchema>;

export type EmployeeSalaryTotals = {
  readonly totalEarnings: number;
  readonly totalDeductions: number;
  readonly estimatedNetSalary: number;
};

export function computeEmployeeSalaryTotals(input: {
  readonly basicSalary: number;
  readonly houseRentAllowance: number;
  readonly otherAllowances: number;
  readonly bonus: number;
  readonly otherEarnings: number;
  readonly providentFund: number;
  readonly professionalTax: number;
  readonly otherDeductions: number;
}): EmployeeSalaryTotals {
  const totalEarnings = roundMoney(
    input.basicSalary +
      input.houseRentAllowance +
      input.otherAllowances +
      input.bonus +
      input.otherEarnings,
  );
  const totalDeductions = roundMoney(
    input.providentFund + input.professionalTax + input.otherDeductions,
  );
  const estimatedNetSalary = roundMoney(totalEarnings - totalDeductions);
  return { totalEarnings, totalDeductions, estimatedNetSalary };
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
