import type { AttendanceSettingsResponse } from '@techwin/contracts';

const WEEKDAY_SHORT_TO_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** Weekday index (Sun=0) for a calendar date in the organisation attendance timezone. */
export function orgWeekdayIndex(dateKey: string, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
  }).formatToParts(new Date(`${dateKey}T12:00:00.000Z`));
  const weekday = parts.find((part) => part.type === 'weekday')?.value ?? 'Mon';
  return WEEKDAY_SHORT_TO_INDEX[weekday] ?? 1;
}

export function scheduleMarksDateOff(
  dateKey: string,
  settings: NonNullable<AttendanceSettingsResponse['current']>,
): boolean {
  const weekday = orgWeekdayIndex(dateKey, settings.timeZone);
  return (
    settings.weeklyOffDays.includes(weekday) ||
    (settings.workingDays.length > 0 && !settings.workingDays.includes(weekday))
  );
}

export function buildScheduleWorkingOverridePayload(dateKey: string) {
  return {
    title: 'Working day',
    description: '',
    eventType: 'SPECIAL_WORKING_DAY' as const,
    startDate: dateKey,
    endDate: dateKey,
    isFullDay: true,
    startTimeMinutes: null,
    endTimeMinutes: null,
    appliesToAllEmployees: true,
    employeeIds: [] as string[],
    recurrence: 'NONE' as const,
    isActive: true,
    color: '#64748b',
  };
}
