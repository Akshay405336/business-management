/** Shared width classes so header and body columns stay aligned (use with `table-fixed`). */
export const EMPLOYEE_LEAVE_RECORDS_TABLE_COLUMN = {
  employee: 'w-[13rem] min-w-[13rem] max-w-[13rem]',
  leaveType: 'w-[7.25rem] min-w-[7.25rem] max-w-[7.25rem]',
  total: 'w-[6.75rem] min-w-[6.75rem] max-w-[6.75rem]',
} as const;

export function employeeLeaveRecordsTableMinWidth(leaveTypeCount: number): string {
  const rem =
    13 + Math.max(leaveTypeCount, 0) * 7.25 + 6.75 * 3;
  return `${rem}rem`;
}
