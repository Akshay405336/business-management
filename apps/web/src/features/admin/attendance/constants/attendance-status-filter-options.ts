import type { AttendanceStatus } from '@techwin/contracts';

export type AttendanceStatusFilter = 'ALL' | AttendanceStatus;

/** Status values exposed in the records toolbar (server-supported). */
export const ATTENDANCE_STATUS_FILTER_OPTIONS: readonly {
  value: AttendanceStatusFilter;
  label: string;
}[] = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'PRESENT', label: 'Present' },
  { value: 'ABSENT', label: 'Absent' },
  { value: 'LATE', label: 'Late' },
  { value: 'HALF_DAY', label: 'Half Day' },
  { value: 'HOLIDAY', label: 'Holiday' },
  { value: 'WEEKLY_OFF', label: 'Weekly Off' },
];
