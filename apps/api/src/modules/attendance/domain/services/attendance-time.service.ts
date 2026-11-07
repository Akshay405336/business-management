import type {
  AttendanceDaySchedule,
  AttendanceScheduleConfig,
} from '../types/attendance-schedule.types.js';

export type ZonedDateParts = {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly weekday: number;
  readonly minutesFromMidnight: number;
};

const weekdayMap: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function formatDateOnly(parts: Pick<ZonedDateParts, 'year' | 'month' | 'day'>): string {
  const month = String(parts.month).padStart(2, '0');
  const day = String(parts.day).padStart(2, '0');
  return `${parts.year}-${month}-${day}`;
}

/**
 * Calendar key for a Prisma DATE. UTC midnight stays on that UTC date.
 * A session-timezone midnight (hours !== 0 in UTC) uses the local calendar date
 * so Asia/Calcutta DATE values do not shift back one day.
 */
export function calendarDateKey(value: Date): string {
  if (
    value.getUTCHours() === 0 &&
    value.getUTCMinutes() === 0 &&
    value.getUTCSeconds() === 0 &&
    value.getUTCMilliseconds() === 0
  ) {
    return value.toISOString().slice(0, 10);
  }
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function hourFromZonedParts(parts: Intl.DateTimeFormatPart[]): number {
  const read = (type: Intl.DateTimeFormatPartTypes): string | undefined =>
    parts.find((part) => part.type === type)?.value;
  const rawHour = Number(read('hour') ?? '0');
  const hour = rawHour === 24 ? 0 : rawHour;
  const dayPeriod = read('dayPeriod');
  if (!dayPeriod) return hour;
  const isPm = /^p/i.test(dayPeriod);
  return (hour % 12) + (isPm ? 12 : 0);
}

export function getZonedParts(instant: Date, timeZone: string): ZonedDateParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  });
  const parts = formatter.formatToParts(instant);
  const read = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value ?? '0';
  const hour = hourFromZonedParts(parts);
  const minute = Number(read('minute'));
  const weekdayLabel = read('weekday');
  return {
    year: Number(read('year')),
    month: Number(read('month')),
    day: Number(read('day')),
    weekday: weekdayMap[weekdayLabel] ?? 0,
    minutesFromMidnight: hour * 60 + minute,
  };
}

export function resolveDayKind(
  schedule: AttendanceScheduleConfig,
  parts: ZonedDateParts,
): 'WORKING' | 'WEEKLY_OFF' {
  if (schedule.weeklyOffDays.includes(parts.weekday)) return 'WEEKLY_OFF';
  if (!schedule.workingDays.includes(parts.weekday)) return 'WEEKLY_OFF';
  return 'WORKING';
}

export function resolveOfficeHoursForWeekday(
  schedule: AttendanceScheduleConfig,
  weekday: number,
): { startMinutes: number; endMinutes: number } {
  const override = schedule.daySchedules.find((entry) => entry.day === weekday);
  if (override) {
    return { startMinutes: override.startMinutes, endMinutes: override.endMinutes };
  }
  return {
    startMinutes: schedule.officeStartMinutes,
    endMinutes: schedule.officeEndMinutes,
  };
}

export function normalizeDaySchedules(
  workingDays: readonly number[],
  officeStartMinutes: number,
  officeEndMinutes: number,
  daySchedules: readonly AttendanceDaySchedule[],
): AttendanceDaySchedule[] {
  const byDay = new Map(daySchedules.map((entry) => [entry.day, entry]));
  return workingDays.map((day) => {
    const existing = byDay.get(day);
    if (existing) return existing;
    return { day, startMinutes: officeStartMinutes, endMinutes: officeEndMinutes };
  });
}

export function diffMinutes(start: Date, end: Date): number {
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 60_000));
}

/** 12-hour clock label for a minutes-from-midnight value, used in policy errors. */
export function formatMinutesClock(minutes: number): string {
  const day = 24 * 60;
  const normalized = ((minutes % day) + day) % day;
  const hour24 = Math.floor(normalized / 60);
  const minute = normalized % 60;
  const period = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${period}`;
}
