import type { AttendanceCalendarDaySummary, OrgCalendarDayKind } from '@techwin/contracts';
import { cn } from '@/shared/lib/utils';

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

export type AttendanceCalendarDayCardVariant =
  | 'outsideMonth'
  | 'holiday'
  | 'weeklyOff'
  | 'nonWorking'
  | 'pastWorking'
  | 'upcomingWorking';

/** Shared date-card palette (Attendance + Task calendars). */
export const ORG_CALENDAR_DAY_CARD_PALETTE: Record<
  AttendanceCalendarDayCardVariant,
  { bg: string; border: string; text: string; dayNumber: string; legendSample: string }
> = {
  pastWorking: {
    bg: 'bg-[#E8F8F0]',
    border: 'border-[#86EFAC]',
    text: 'text-[#166534]',
    dayNumber: 'bg-[#DCFCE7] text-[#166534]',
    legendSample: 'bg-[#E8F8F0] border-[#86EFAC]',
  },
  upcomingWorking: {
    bg: 'bg-[#EFF6FF]',
    border: 'border-[#93C5FD]',
    text: 'text-[#1D4ED8]',
    dayNumber: 'bg-[#DBEAFE] text-[#1D4ED8]',
    legendSample: 'bg-[#EFF6FF] border-[#93C5FD]',
  },
  holiday: {
    bg: 'bg-[#FEF9C3]',
    border: 'border-[#FBBF24]',
    text: 'text-[#B45309]',
    dayNumber: 'bg-[#FEF3C7] text-[#B45309]',
    legendSample: 'bg-[#FEF9C3] border-[#FBBF24]',
  },
  weeklyOff: {
    bg: 'bg-[#F3EEFF]',
    border: 'border-[#A78BFA]',
    text: 'text-[#6D28D9]',
    dayNumber: 'bg-[#EDE9FE] text-[#7C3AED]',
    legendSample: 'bg-[#F3EEFF] border-[#A78BFA]',
  },
  nonWorking: {
    bg: 'bg-[#F4F4F5]',
    border: 'border-[#D4D4D8]',
    text: 'text-[#52525B]',
    dayNumber: 'bg-[#E4E4E7] text-[#52525B]',
    legendSample: 'bg-[#F4F4F5] border-[#D4D4D8]',
  },
  outsideMonth: {
    bg: 'bg-[#F9FAFB]',
    border: 'border-[#E5E7EB]',
    text: 'text-[#9CA3AF]',
    dayNumber: 'bg-[#F3F4F6] text-[#9CA3AF]',
    legendSample: 'bg-[#F9FAFB] border-[#E5E7EB]',
  },
};

export type AttendanceCalendarDayCardStyle = {
  variant: AttendanceCalendarDayCardVariant;
  bg: string;
  border: string;
  text: string;
  dayNumberClass: string;
  mutedContent: boolean;
};

function isOrgHolidayKind(kind: OrgCalendarDayKind | undefined): boolean {
  return kind === 'HOLIDAY' || kind === 'OFFICE_CLOSURE';
}

function isOrgWeeklyOffKind(kind: OrgCalendarDayKind | undefined): boolean {
  return kind === 'WEEKLY_OFF';
}

function orgCalendarCardVariantForKind(
  kind: OrgCalendarDayKind,
  dateKey: string,
  orgTodayKey: string,
): AttendanceCalendarDayCardVariant {
  if (isOrgHolidayKind(kind)) return 'holiday';
  if (isOrgWeeklyOffKind(kind)) return 'weeklyOff';
  if (kind === 'NON_WORKING') return 'nonWorking';
  if (kind === 'SPECIAL_WORKING' || kind === 'HALF_DAY' || kind === 'WORKING') {
    if (dateKey > orgTodayKey) return 'upcomingWorking';
    return 'pastWorking';
  }
  if (dateKey > orgTodayKey) return 'upcomingWorking';
  return 'pastWorking';
}

/** Date card colours driven by organisation calendar + org timezone "today". */
export function resolveAttendanceCalendarDayCardStyle(input: {
  dateKey: string;
  organizationDayKind: OrgCalendarDayKind | undefined;
  isCurrentMonth: boolean;
  orgTodayKey: string;
}): AttendanceCalendarDayCardStyle {
  const kind = input.organizationDayKind ?? 'WORKING';
  const variant = orgCalendarCardVariantForKind(kind, input.dateKey, input.orgTodayKey);
  const mutedAdjacent =
    !input.isCurrentMonth &&
    (variant === 'holiday' || variant === 'weeklyOff' || variant === 'nonWorking');

  if (!input.isCurrentMonth && !mutedAdjacent) {
    const palette = ORG_CALENDAR_DAY_CARD_PALETTE.outsideMonth;
    return {
      variant: 'outsideMonth',
      bg: palette.bg,
      border: palette.border,
      text: palette.text,
      dayNumberClass: cn(palette.dayNumber, 'font-bold'),
      mutedContent: true,
    };
  }

  const palette = ORG_CALENDAR_DAY_CARD_PALETTE[variant];
  const dayNumberClass = cn(palette.dayNumber, 'font-bold tabular-nums');

  return {
    variant,
    bg: palette.bg,
    border: palette.border,
    text: palette.text,
    dayNumberClass,
    mutedContent: mutedAdjacent,
  };
}

export function attendanceCalendarTodayRingClass(isToday: boolean, isSelected: boolean): string {
  if (!isToday) {
    return isSelected ? 'ring-2 ring-[#8B6BD6] ring-inset' : '';
  }
  return cn(
    'ring-2 ring-[#6366F1] ring-offset-1',
    isSelected ? 'shadow-[0_0_0_1px_rgba(139,107,214,0.5),0_6px_16px_rgba(91,53,181,0.22)]' : 'shadow-[0_0_0_1px_rgba(99,102,241,0.4),0_4px_12px_rgba(91,53,181,0.18)]',
  );
}

export const ATTENDANCE_DATE_CARD_LEGEND: readonly {
  key: AttendanceCalendarDayCardVariant;
  label: string;
  sampleClass: string;
}[] = [
  {
    key: 'pastWorking',
    label: 'Working day',
    sampleClass: ORG_CALENDAR_DAY_CARD_PALETTE.pastWorking.legendSample,
  },
  {
    key: 'upcomingWorking',
    label: 'Upcoming working day',
    sampleClass: ORG_CALENDAR_DAY_CARD_PALETTE.upcomingWorking.legendSample,
  },
  {
    key: 'holiday',
    label: 'Holiday',
    sampleClass: ORG_CALENDAR_DAY_CARD_PALETTE.holiday.legendSample,
  },
  {
    key: 'weeklyOff',
    label: 'Sunday / weekly off',
    sampleClass: ORG_CALENDAR_DAY_CARD_PALETTE.weeklyOff.legendSample,
  },
];
