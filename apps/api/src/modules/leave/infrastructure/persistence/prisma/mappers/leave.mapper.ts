import { Decimal } from '@prisma/client/runtime/client';
import type {
  EmployeeLeaveBalance,
  LeaveBalanceTransaction,
  LeaveRequest,
  LeaveRequestDate,
  LeaveType,
  LeaveYearAllocation,
  LeaveYearConfiguration,
} from '../../../../../../generated/prisma/client.js';
import type {
  EmployeeLeaveBalanceItem,
  LeaveRequestItem,
  LeaveYearAllocationItem,
  LeaveYearConfigurationItem,
} from '@techwin/contracts';
import type { LeaveBalanceTransactionItem } from '../../../../domain/repositories/leave.repository.js';
import { expandInclusiveCalendarRange } from '../../../../domain/policies/leave-request-dates.policy.js';

export function formatLeaveDays(value: Decimal): string {
  const fixed = value.toFixed(1);
  return fixed.endsWith('.0') ? fixed.slice(0, -2) : fixed;
}

export function parseLeaveDays(value: string): Decimal {
  return new Decimal(value);
}

export function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function formatDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function computeAvailableDays(balance: {
  allocatedDays: Decimal;
  carryForwardDays: Decimal;
  adjustmentCreditDays: Decimal;
  adjustmentDebitDays: Decimal;
  usedApprovedDays: Decimal;
  reservedPendingDays: Decimal;
}): string {
  const available = balance.allocatedDays
    .add(balance.carryForwardDays)
    .add(balance.adjustmentCreditDays)
    .sub(balance.adjustmentDebitDays)
    .sub(balance.usedApprovedDays);
  return formatLeaveDays(available);
}

export type LeaveYearConfigurationWithAllocations = LeaveYearConfiguration & {
  allocations: (LeaveYearAllocation & { leaveType: LeaveType })[];
};

function sumActiveAllocationDays(
  allocations: readonly { isActive: boolean; annualAllocationDays: Decimal }[],
): string {
  let total = new Decimal(0);
  for (const row of allocations) {
    if (row.isActive) total = total.add(row.annualAllocationDays);
  }
  return formatLeaveDays(total);
}

export function toLeaveYearConfigurationItem(
  row: LeaveYearConfiguration | LeaveYearConfigurationWithAllocations,
): LeaveYearConfigurationItem {
  const allocations =
    'allocations' in row
      ? row.allocations
          .filter((entry) => entry.isActive)
          .map((entry) => ({
            leaveTypeId: entry.leaveTypeId,
            leaveTypeName: entry.leaveType.name,
            annualAllocationDays: formatLeaveDays(entry.annualAllocationDays),
          }))
      : [];

  return {
    id: row.id,
    name: row.name?.trim() ? row.name : `Leave policy ${row.calendarYear}`,
    calendarYear: row.calendarYear,
    yearStartDate: formatDateOnly(row.yearStartDate),
    yearEndDate: formatDateOnly(row.yearEndDate),
    status: row.status,
    balancesGeneratedAt: row.balancesGeneratedAt?.toISOString() ?? null,
    activatedAt: row.activatedAt?.toISOString() ?? null,
    totalAllocatedDays:
      'allocations' in row ? sumActiveAllocationDays(row.allocations) : '0',
    allocations,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toLeaveYearAllocationItem(
  row: LeaveYearAllocation & { leaveType: LeaveType; leaveYearConfiguration: LeaveYearConfiguration },
): LeaveYearAllocationItem {
  return {
    id: row.id,
    leaveYearConfigurationId: row.leaveYearConfigurationId,
    calendarYear: row.leaveYearConfiguration.calendarYear,
    leaveTypeId: row.leaveTypeId,
    leaveTypeName: row.leaveType.name,
    leaveTypeCode: row.leaveType.code,
    isPaid: row.leaveType.kind === 'PAID',
    annualAllocationDays: formatLeaveDays(row.annualAllocationDays),
    accrualMethod: row.accrualMethod,
    carryForwardEnabled: row.carryForwardEnabled,
    maxCarryForwardDays: formatLeaveDays(row.maxCarryForwardDays),
    eligibility: row.eligibility,
    effectiveFrom: formatDateOnly(row.effectiveFrom),
    effectiveTo: row.effectiveTo ? formatDateOnly(row.effectiveTo) : null,
    isActive: row.isActive,
  };
}

export function toEmployeeLeaveBalanceItem(
  row: EmployeeLeaveBalance & {
    leaveType: LeaveType;
    leaveYearConfiguration: LeaveYearConfiguration;
    employee?: { displayName: string; employeeCode: string };
  },
): EmployeeLeaveBalanceItem {
  return {
    id: row.id,
    employeeId: row.employeeId,
    employeeDisplayName: row.employee?.displayName ?? '',
    employeeCode: row.employee?.employeeCode ?? '',
    leaveTypeId: row.leaveTypeId,
    leaveTypeName: row.leaveType.name,
    leaveTypeCode: row.leaveType.code,
    leaveTypeIsPaid: row.leaveType.kind === 'PAID',
    calendarYear: row.leaveYearConfiguration.calendarYear,
    allocatedDays: formatLeaveDays(row.allocatedDays),
    carryForwardDays: formatLeaveDays(row.carryForwardDays),
    adjustmentCreditDays: formatLeaveDays(row.adjustmentCreditDays),
    adjustmentDebitDays: formatLeaveDays(row.adjustmentDebitDays),
    usedApprovedDays: formatLeaveDays(row.usedApprovedDays),
    reservedPendingDays: formatLeaveDays(row.reservedPendingDays),
    availableDays: computeAvailableDays(row),
  };
}

export function toLeaveRequestItem(
  row: LeaveRequest & {
    leaveType: LeaveType;
    leaveYearConfiguration: LeaveYearConfiguration;
    employee: { displayName: string; employeeCode: string };
    selectedDates?: readonly LeaveRequestDate[];
  },
): LeaveRequestItem {
  const startDate = formatDateOnly(row.startDate);
  const endDate = formatDateOnly(row.endDate);
  const selectedDates =
    row.selectedDates && row.selectedDates.length > 0
      ? row.selectedDates.map((entry) => formatDateOnly(entry.leaveDate))
      : expandInclusiveCalendarRange(startDate, endDate);

  return {
    id: row.id,
    employeeId: row.employeeId,
    employeeDisplayName: row.employee.displayName,
    employeeCode: row.employee.employeeCode,
    leaveTypeId: row.leaveTypeId,
    leaveTypeName: row.leaveType.name,
    leaveTypeCode: row.leaveType.code,
    calendarYear: row.leaveYearConfiguration.calendarYear,
    startDate,
    endDate,
    selectedDates,
    isHalfDay: row.isHalfDay,
    halfDaySession: row.halfDaySession,
    halfDayDate: row.halfDayDate ? formatDateOnly(row.halfDayDate) : null,
    totalDays: formatLeaveDays(row.totalDays),
    reason: row.reason,
    notes: row.notes,
    attachmentStoredObjectId: row.attachmentStoredObjectId,
    status: row.status,
    appliedAt: row.appliedAt.toISOString(),
    decidedAt: row.decidedAt?.toISOString() ?? null,
    rejectionReason: row.rejectionReason,
  };
}

export function toLeaveBalanceTransactionItem(row: LeaveBalanceTransaction): LeaveBalanceTransactionItem {
  return {
    id: row.id,
    employeeId: row.employeeId,
    leaveTypeId: row.leaveTypeId,
    employeeLeaveBalanceId: row.employeeLeaveBalanceId,
    calendarYear: row.calendarYear,
    transactionType: row.transactionType,
    days: formatLeaveDays(row.days),
    balanceBeforeDays: formatLeaveDays(row.balanceBeforeDays),
    balanceAfterDays: formatLeaveDays(row.balanceAfterDays),
    leaveRequestId: row.leaveRequestId,
    reason: row.reason,
    performedByAdminId: row.performedByAdminId,
    createdAt: row.createdAt.toISOString(),
  };
}

export function inclusiveCalendarDays(startDate: string, endDate: string, isHalfDay: boolean): Decimal {
  if (isHalfDay) {
    return new Decimal('0.5');
  }
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  const diffMs = end.getTime() - start.getTime();
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1;
  return new Decimal(Math.max(days, 0));
}
