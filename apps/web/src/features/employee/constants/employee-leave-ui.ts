import type { EmployeeLeaveBalanceItem } from '@techwin/contracts';
import { cn } from '@/shared/lib/utils';
import { EMPLOYEE_ATTENDANCE_TABLE_HEAD } from '@/features/employee/constants/employee-attendance-ui';

export const EMPLOYEE_LEAVE_SURFACE = {
  section: 'workspace-surface min-w-0 overflow-hidden rounded-xl border border-[#E8E8EF] bg-white shadow-sm',
  headerBar: 'border-b border-[#E8E8EF] bg-[#FAFBFD] px-4 py-2.5 sm:px-5',
} as const;

export const EMPLOYEE_LEAVE_TAB_TRIGGER =
  'h-8 rounded-md px-3 text-xs data-[state=active]:border data-[state=active]:border-[#E8E8EF] data-[state=active]:bg-white data-[state=active]:text-[#5B35B5] data-[state=active]:shadow-xs';

export const EMPLOYEE_LEAVE_TABLE_HEAD = cn(
  EMPLOYEE_ATTENDANCE_TABLE_HEAD,
  'bg-[#F8F9FC] text-[10px] font-semibold uppercase tracking-wide text-[#64748B]',
);

export const EMPLOYEE_LEAVE_TABLE_CELL = 'px-3 py-2.5 text-sm text-[#1E293B]';

export const EMPLOYEE_LEAVE_TABLE_COL = {
  type: 'w-[22%] min-w-[8rem]',
  dates: 'w-[28%] min-w-[9rem]',
  days: 'w-[10%] min-w-[4rem]',
  status: 'w-[14%] min-w-[6rem]',
  actions: 'w-[8rem] min-w-[6rem]',
} as const;

export const EMPLOYEE_LEAVE_TABLE_CLASS =
  'table-fixed w-full [&_[data-slot=table-head]]:h-auto [&_[data-slot=table-head]]:py-2.5 [&_[data-slot=table-cell]]:py-2.5';

export const EMPLOYEE_LEAVE_TABLE_BODY =
  '[&_[data-slot=table-row]]:border-b [&_[data-slot=table-row]]:border-[#F1F5F9] [&_[data-slot=table-row]:last-child]:border-0 [&_[data-slot=table-row]:nth-child(even)]:bg-[#FAFBFD]/60 [&_[data-slot=table-row]:hover]:bg-[#F5F5F5]';

export function parseLeaveDayAmount(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function hasLeaveBalanceAvailable(balance: EmployeeLeaveBalanceItem): boolean {
  return parseLeaveDayAmount(balance.availableDays) > 0;
}

export function formatLeaveBalanceSummary(balance: EmployeeLeaveBalanceItem): string {
  const days = parseLeaveDayAmount(balance.availableDays);
  const dayWord = days === 1 ? 'day' : 'days';
  return `${balance.availableDays} ${dayWord} available`;
}

export function formatLeaveTypeOptionLabel(balance: EmployeeLeaveBalanceItem): string {
  const days = parseLeaveDayAmount(balance.availableDays);
  const dayWord = days === 1 ? 'day' : 'days';
  const paidHint = balance.leaveTypeIsPaid ? '' : ' · Unpaid';
  return `${balance.leaveTypeName} · ${balance.availableDays} ${dayWord} available${paidHint}`;
}

export function firstSelectableLeaveTypeId(
  balances: readonly EmployeeLeaveBalanceItem[],
): string | null {
  const row = balances.find(hasLeaveBalanceAvailable);
  return row?.leaveTypeId ?? balances[0]?.leaveTypeId ?? null;
}
