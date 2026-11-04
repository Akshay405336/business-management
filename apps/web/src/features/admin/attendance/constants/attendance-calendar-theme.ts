import type { AttendanceCalendarDaySummary } from '@techwin/contracts';

export const ATTENDANCE_CALENDAR_SURFACE = {
  border: '#E8E8EF',
  headerBg: '#F8F9FC',
  gridBg: '#FFFFFF',
  mutedCell: '#FAFBFD',
  todayRing: '#5B35B5',
  todayBg: '#F3EEFF',
  selectedBg: '#F9F7FF',
  selectedRing: '#8B6BD6',
  hoverRing: '#C4B5FD',
} as const;

export const ATTENDANCE_STATUS_VISUAL = {
  PRESENT: { label: 'Present', color: '#16A34A', dot: 'bg-emerald-500' },
  LATE: { label: 'Late', color: '#EA580C', dot: 'bg-orange-500' },
  ABSENT: { label: 'Absent', color: '#DC2626', dot: 'bg-red-500' },
  HALF_DAY: { label: 'Half day', color: '#9333EA', dot: 'bg-violet-500' },
  HOLIDAY: { label: 'Holiday', color: '#64748B', dot: 'bg-slate-400' },
  WEEKLY_OFF: { label: 'Weekly off', color: '#94A3B8', dot: 'bg-slate-300' },
  ON_LEAVE: { label: 'On leave', color: '#0EA5E9', dot: 'bg-sky-500' },
  PENDING: { label: 'Pending', color: '#D97706', dot: 'bg-amber-500' },
} as const;

export type AttendanceCalendarStatusKey = keyof typeof ATTENDANCE_STATUS_VISUAL;

export const ATTENDANCE_CALENDAR_LEGEND: readonly AttendanceCalendarStatusKey[] = [
  'PRESENT',
  'LATE',
  'ABSENT',
  'HALF_DAY',
  'PENDING',
  'HOLIDAY',
  'WEEKLY_OFF',
];

type StatusSlice = { key: AttendanceCalendarStatusKey; value: number };

export function calendarStatusSlices(summary: AttendanceCalendarDaySummary | null): StatusSlice[] {
  if (!summary || summary.total <= 0) return [];
  const rows: StatusSlice[] = [];
  if (summary.present > 0) rows.push({ key: 'PRESENT', value: summary.present });
  if (summary.late > 0) rows.push({ key: 'LATE', value: summary.late });
  if (summary.absent > 0) rows.push({ key: 'ABSENT', value: summary.absent });
  if (summary.halfDay > 0) rows.push({ key: 'HALF_DAY', value: summary.halfDay });
  if (summary.pending > 0) rows.push({ key: 'PENDING', value: summary.pending });
  if (summary.onLeave > 0) rows.push({ key: 'ON_LEAVE', value: summary.onLeave });
  if (summary.holiday > 0) rows.push({ key: 'HOLIDAY', value: summary.holiday });
  if (summary.weeklyOff > 0) rows.push({ key: 'WEEKLY_OFF', value: summary.weeklyOff });
  return rows.sort((a, b) => b.value - a.value);
}

export const CALENDAR_CELL_MAX_STATUS_LINES = 3;
