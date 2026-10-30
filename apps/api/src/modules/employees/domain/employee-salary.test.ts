import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { computeEmployeeSalaryTotals } from '@techwin/validation';

describe('computeEmployeeSalaryTotals', () => {
  it('sums earnings and deductions', () => {
    const totals = computeEmployeeSalaryTotals({
      basicSalary: 50_000,
      houseRentAllowance: 10_000,
      otherAllowances: 2_000,
      bonus: 1_000,
      otherEarnings: 500,
      providentFund: 3_000,
      professionalTax: 200,
      otherDeductions: 100,
    });
    assert.equal(totals.totalEarnings, 63_500);
    assert.equal(totals.totalDeductions, 3_300);
    assert.equal(totals.estimatedNetSalary, 60_200);
  });
});
