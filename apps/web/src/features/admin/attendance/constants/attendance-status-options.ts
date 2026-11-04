import type { AttendanceStatus } from '@techwin/contracts';

export const ATTENDANCE_STATUS_OPTIONS: readonly {
  value: AttendanceStatus;
  label: string;
}[] = [
  { value: 'PRESENT', label: 'Present' },
  { value: 'ABSENT', label: 'Absent' },
  { value: 'LATE', label: 'Late' },
  { value: 'HALF_DAY', label: 'Half Day' },
  { value: 'ON_LEAVE', label: 'On Leave' },
  { value: 'HOLIDAY', label: 'Holiday' },
  { value: 'WEEKLY_OFF', label: 'Weekly Off' },
  { value: 'PENDING', label: 'Pending' },
];
