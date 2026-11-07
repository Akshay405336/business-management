import { EMPLOYEE_ROUTES } from '@techwin/contracts';
import type {
  EmployeeLeaveRecordLeaveTypeBalance,
  EmployeeLeaveRecordRow,
  EmployeeLeaveRecordsResponse,
} from '@techwin/contracts';
import { Decimal } from '@prisma/client/runtime/client';
import type { Employee, EmployeeLeaveBalance, LeaveType } from '../../../../../../generated/prisma/client.js';
import {
  computeAvailableDays,
  formatLeaveDays,
  parseLeaveDays,
  toLeaveYearConfigurationItem,
} from './leave.mapper.js';
import type { LeaveYearConfigurationWithAllocations } from './leave.mapper.js';

function employeeProfileImageUrl(employee: Employee): string | null {
  return employee.profileImageStoredObjectId
    ? EMPLOYEE_ROUTES.employeeStoredProfileImageContent(employee.profileImageStoredObjectId)
    : employee.profileImageUrl;
}

function sumDayStrings(values: readonly string[]): string {
  let total = new Decimal(0);
  for (const value of values) {
    total = total.add(parseLeaveDays(value));
  }
  return formatLeaveDays(total);
}

type BalanceRow = EmployeeLeaveBalance & { leaveType: LeaveType };

export function buildEmployeeLeaveRecordsResponse(input: {
  configuration: LeaveYearConfigurationWithAllocations;
  employees: readonly (Employee & {
    employeeLeaveBalances: readonly BalanceRow[];
  })[];
  total: number;
  page: number;
  pageSize: number;
}): EmployeeLeaveRecordsResponse {
  const configuration = toLeaveYearConfigurationItem(input.configuration);
  const leaveTypeColumns = configuration.allocations.map((line) => ({
    leaveTypeId: line.leaveTypeId,
    leaveTypeName: line.leaveTypeName,
  }));

  const items: EmployeeLeaveRecordRow[] = input.employees.map((employee) => {
    const balanceByType = new Map(employee.employeeLeaveBalances.map((row) => [row.leaveTypeId, row]));
    const leaveTypes: EmployeeLeaveRecordLeaveTypeBalance[] = leaveTypeColumns.map((column) => {
      const balance = balanceByType.get(column.leaveTypeId);
      if (!balance) {
        return {
          leaveTypeId: column.leaveTypeId,
          leaveTypeName: column.leaveTypeName,
          allocatedDays: '0',
          usedDays: '0',
          availableDays: '0',
        };
      }
      return {
        leaveTypeId: column.leaveTypeId,
        leaveTypeName: column.leaveTypeName,
        allocatedDays: formatLeaveDays(balance.allocatedDays),
        usedDays: formatLeaveDays(balance.usedApprovedDays),
        availableDays: computeAvailableDays(balance),
      };
    });

    return {
      employeeId: employee.id,
      employeeDisplayName: employee.displayName,
      employeeCode: employee.employeeCode,
      profileImageUrl: employeeProfileImageUrl(employee),
      leaveTypes,
      totalAllocatedDays: sumDayStrings(leaveTypes.map((row) => row.allocatedDays)),
      totalUsedDays: sumDayStrings(leaveTypes.map((row) => row.usedDays)),
      totalAvailableDays: sumDayStrings(leaveTypes.map((row) => row.availableDays)),
    };
  });

  return {
    configuration,
    leaveTypeColumns,
    items,
    total: input.total,
    page: input.page,
    pageSize: input.pageSize,
  };
}
