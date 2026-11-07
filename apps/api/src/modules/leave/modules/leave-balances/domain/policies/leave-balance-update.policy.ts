import { Decimal } from '@prisma/client/runtime/client';
import { LeaveValidationError } from '../../../../domain/errors/leave.errors.js';

export type EmployeeBalanceUsageRow = {
  readonly leaveTypeId: string;
  readonly leaveTypeName?: string;
  readonly allocatedDays: Decimal;
  readonly usedApprovedDays: Decimal;
  readonly reservedPendingDays: Decimal;
  readonly adjustmentCreditDays: Decimal;
  readonly adjustmentDebitDays: Decimal;
  readonly carryForwardDays: Decimal;
};

export function employeeBalanceHasProtectedUsage(row: EmployeeBalanceUsageRow): boolean {
  return (
    row.usedApprovedDays.greaterThan(0) ||
    row.reservedPendingDays.greaterThan(0) ||
    row.adjustmentCreditDays.greaterThan(0) ||
    row.adjustmentDebitDays.greaterThan(0) ||
    row.carryForwardDays.greaterThan(0)
  );
}

export function assertAllocationReductionAllowed(
  row: EmployeeBalanceUsageRow,
  nextAllocatedDays: Decimal,
  leaveTypeName: string,
): void {
  const committed = row.usedApprovedDays.add(row.reservedPendingDays);
  if (nextAllocatedDays.lessThan(committed)) {
    throw new LeaveValidationError(
      `Cannot reduce ${leaveTypeName} to ${nextAllocatedDays.toString()} days because ${committed.toString()} day(s) are already used or reserved.`,
    );
  }
}

export function assertLeaveTypeRemovalAllowed(
  balances: readonly EmployeeBalanceUsageRow[],
  leaveTypeId: string,
  leaveTypeName: string,
): void {
  const related = balances.filter((row) => row.leaveTypeId === leaveTypeId);
  if (related.some(employeeBalanceHasProtectedUsage)) {
    throw new LeaveValidationError(
      `Cannot remove ${leaveTypeName} because employees already have usage, adjustments, or reserved leave on this allocation.`,
    );
  }
}
