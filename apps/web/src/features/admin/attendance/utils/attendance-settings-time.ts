import type { AttendanceDaySchedule, AttendanceScheduleSettings } from '@techwin/contracts';
import type { UpsertAttendanceSettingsRequest } from '@techwin/validation';

export type Time12Parts = {
  hour12: number;
  minute: number;
  period: 'AM' | 'PM';
};

export type DayScheduleRow = {
  day: number;
  label: string;
  isWorking: boolean;
  start: Time12Parts;
  end: Time12Parts;
};

export type AttendanceSettingsFormState = {
  effectiveFrom: string;
  timeZone: string;
  officeStart: Time12Parts;
  officeEnd: Time12Parts;
  lateGraceMinutes: number;
  attendanceCutoff: Time12Parts;
  fullDayHours: number;
  fullDayMinutes: number;
  halfDayHours: number;
  halfDayMinutes: number;
  earlyPunchInHours: number;
  earlyPunchInMinutes: number;
  allowPunchOutAfterOfficeEnd: boolean;
  requireRegisteredDevice: boolean;
  dayRows: DayScheduleRow[];
};

export const WEEKDAY_UI_ROWS: readonly { day: number; label: string }[] = [
  { day: 1, label: 'Monday' },
  { day: 2, label: 'Tuesday' },
  { day: 3, label: 'Wednesday' },
  { day: 4, label: 'Thursday' },
  { day: 5, label: 'Friday' },
  { day: 6, label: 'Saturday' },
  { day: 0, label: 'Sunday' },
];

export function minutesToTime12(minutes: number): Time12Parts {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, minutes));
  const hour24 = Math.floor(clamped / 60);
  const minute = clamped % 60;
  const period: 'AM' | 'PM' = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return { hour12, minute, period };
}

export function time12ToMinutes(parts: Time12Parts): number {
  let hour24 = parts.hour12 % 12;
  if (parts.period === 'PM') hour24 += 12;
  return hour24 * 60 + parts.minute;
}

export function splitDurationMinutes(total: number): { hours: number; minutes: number } {
  const safe = Math.max(0, total);
  return { hours: Math.floor(safe / 60), minutes: safe % 60 };
}

export function joinDurationMinutes(hours: number, minutes: number): number {
  return Math.max(0, hours) * 60 + Math.max(0, Math.min(59, minutes));
}

export function defaultFormState(): AttendanceSettingsFormState {
  const today = new Date().toISOString().slice(0, 10);
  const officeStart = minutesToTime12(9 * 60 + 30);
  const officeEnd = minutesToTime12(18 * 60 + 30);
  return {
    effectiveFrom: today,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    officeStart,
    officeEnd,
    lateGraceMinutes: 15,
    attendanceCutoff: minutesToTime12(11 * 60),
    fullDayHours: 8,
    fullDayMinutes: 0,
    halfDayHours: 4,
    halfDayMinutes: 0,
    earlyPunchInHours: 0,
    earlyPunchInMinutes: 30,
    allowPunchOutAfterOfficeEnd: true,
    requireRegisteredDevice: false,
    dayRows: WEEKDAY_UI_ROWS.map(({ day, label }) => ({
      day,
      label,
      isWorking: day >= 1 && day <= 5,
      start: { ...officeStart },
      end: { ...officeEnd },
    })),
  };
}

function dayScheduleMap(
  daySchedules: readonly AttendanceDaySchedule[],
): Map<number, AttendanceDaySchedule> {
  return new Map(daySchedules.map((entry) => [entry.day, entry]));
}

export function formStateFromSettings(current: AttendanceScheduleSettings): AttendanceSettingsFormState {
  const officeStart = minutesToTime12(current.officeStartMinutes);
  const officeEnd = minutesToTime12(current.officeEndMinutes);
  const fullDay = splitDurationMinutes(current.minFullDayMinutes);
  const halfDay = splitDurationMinutes(current.minHalfDayMinutes);
  const early = splitDurationMinutes(current.earlyPunchInAllowanceMinutes);
  const byDay = dayScheduleMap(current.daySchedules ?? []);
  const workingSet = new Set(current.workingDays);

  return {
    effectiveFrom: current.effectiveFrom,
    timeZone: current.timeZone,
    officeStart,
    officeEnd,
    lateGraceMinutes: current.lateGraceMinutes,
    attendanceCutoff: minutesToTime12(current.attendanceCutoffMinutes),
    fullDayHours: fullDay.hours,
    fullDayMinutes: fullDay.minutes,
    halfDayHours: halfDay.hours,
    halfDayMinutes: halfDay.minutes,
    earlyPunchInHours: early.hours,
    earlyPunchInMinutes: early.minutes,
    allowPunchOutAfterOfficeEnd: current.allowPunchOutAfterOfficeEnd,
    requireRegisteredDevice: current.requireRegisteredDevice,
    dayRows: WEEKDAY_UI_ROWS.map(({ day, label }) => {
      const isWorking = workingSet.has(day);
      const schedule = byDay.get(day);
      return {
        day,
        label,
        isWorking,
        start: minutesToTime12(schedule?.startMinutes ?? current.officeStartMinutes),
        end: minutesToTime12(schedule?.endMinutes ?? current.officeEndMinutes),
      };
    }),
  };
}

export function formStateToPayload(form: AttendanceSettingsFormState): UpsertAttendanceSettingsRequest {
  const officeStartMinutes = time12ToMinutes(form.officeStart);
  const officeEndMinutes = time12ToMinutes(form.officeEnd);
  const workingDays = form.dayRows.filter((row) => row.isWorking).map((row) => row.day);
  const weeklyOffDays = form.dayRows.filter((row) => !row.isWorking).map((row) => row.day);

  return {
    effectiveFrom: form.effectiveFrom,
    timeZone: form.timeZone.trim(),
    officeStartMinutes,
    officeEndMinutes,
    lateGraceMinutes: form.lateGraceMinutes,
    attendanceCutoffMinutes: time12ToMinutes(form.attendanceCutoff),
    minFullDayMinutes: joinDurationMinutes(form.fullDayHours, form.fullDayMinutes),
    minHalfDayMinutes: joinDurationMinutes(form.halfDayHours, form.halfDayMinutes),
    weeklyOffDays,
    workingDays,
    daySchedules: form.dayRows
      .filter((row) => row.isWorking)
      .map((row) => ({
        day: row.day,
        startMinutes: time12ToMinutes(row.start),
        endMinutes: time12ToMinutes(row.end),
      })),
    earlyPunchInAllowanceMinutes: joinDurationMinutes(
      form.earlyPunchInHours,
      form.earlyPunchInMinutes,
    ),
    requireRegisteredDevice: form.requireRegisteredDevice,
    ipAllowlist: [],
    allowPunchOutAfterOfficeEnd: form.allowPunchOutAfterOfficeEnd,
  };
}

export function serializeFormState(form: AttendanceSettingsFormState): string {
  return JSON.stringify(form);
}
