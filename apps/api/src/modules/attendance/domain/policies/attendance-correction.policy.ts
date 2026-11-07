import type { AttendanceScheduleSnapshot } from '../read-models/attendance.models.js';
import { AttendancePolicyError } from '../errors/attendance.errors.js';
import type { AttendanceStatus } from '../enums/attendance-status.enum.js';
import { assertPunchInAllowed, evaluateAttendance } from './attendance-status.policy.js';
import {
  getZonedParts,
  resolveOfficeHoursForWeekday,
} from '../services/attendance-time.service.js';
import type { AttendanceScheduleConfig } from '../types/attendance-schedule.types.js';
import type { CorrectAttendanceRecordInput } from '../types/attendance-inputs.js';
import type { ApprovedLeaveCoverage } from './attendance-reconciliation.policy.js';

export type AttendanceCorrectionResult = {
  readonly punchInAt: Date | null;
  readonly punchOutAt: Date | null;
  readonly status: AttendanceStatus;
  readonly workingMinutes: number | null;
  readonly lateMinutes: number;
  readonly earlyMinutes: number;
  readonly leftEarlyMinutes: number;
  readonly stayedLateMinutes: number;
};

function snapshotToScheduleConfig(snapshot: AttendanceScheduleSnapshot): AttendanceScheduleConfig {
  return {
    scheduleId: snapshot.scheduleId,
    timeZone: snapshot.timeZone,
    officeStartMinutes: snapshot.officeStartMinutes,
    officeEndMinutes: snapshot.officeEndMinutes,
    lateGraceMinutes: snapshot.lateGraceMinutes,
    minFullDayMinutes: snapshot.minFullDayMinutes,
    minHalfDayMinutes: snapshot.minHalfDayMinutes,
    weeklyOffDays: snapshot.weeklyOffDays,
    workingDays: snapshot.workingDays,
    daySchedules: snapshot.daySchedules,
    earlyPunchInAllowanceMinutes: snapshot.earlyPunchInAllowanceMinutes,
    requireRegisteredDevice: snapshot.requireRegisteredDevice,
    allowPunchOutAfterOfficeEnd: snapshot.allowPunchOutAfterOfficeEnd,
  };
}

function resolveTimestamp(
  patch: string | null | undefined,
  current: Date | null,
): Date | null {
  if (patch === undefined) return current;
  if (patch === null) return null;
  const parsed = new Date(patch);
  if (Number.isNaN(parsed.getTime())) {
    throw new AttendancePolicyError('Invalid punch timestamp.');
  }
  return parsed;
}

function weekdayForAttendanceDate(attendanceDate: string, timeZone: string): number {
  const anchor = new Date(`${attendanceDate}T12:00:00.000Z`);
  return getZonedParts(anchor, timeZone).weekday;
}

/**
 * Admin create and edit. Status is derived; a client-supplied status is ignored.
 * Approved full-day or half-day leave applies only when there is no punch-in.
 * A punch is rejected before the earliest allowed time. Historical admin
 * corrections may still record a punch after office end.
 */
export function applyAttendanceCorrection(input: {
  readonly attendanceDate: string;
  readonly scheduleSnapshot: AttendanceScheduleSnapshot;
  readonly current: {
    readonly punchInAt: Date | null;
    readonly punchOutAt: Date | null;
    readonly status: AttendanceStatus;
  };
  readonly patch: CorrectAttendanceRecordInput;
  readonly leave?: ApprovedLeaveCoverage;
  readonly dayKind?: 'WORKING' | 'HOLIDAY' | 'WEEKLY_OFF';
  /** False only while today's office end is still ahead. */
  readonly officeEnded?: boolean;
}): AttendanceCorrectionResult {
  const punchInAt = resolveTimestamp(input.patch.punchInAt, input.current.punchInAt);
  const punchOutAt = punchInAt
    ? resolveTimestamp(input.patch.punchOutAt, input.current.punchOutAt)
    : null;

  if (punchInAt && punchOutAt && punchOutAt.getTime() <= punchInAt.getTime()) {
    throw new AttendancePolicyError('Punch out must be after punch in.');
  }

  const schedule = snapshotToScheduleConfig(input.scheduleSnapshot);
  if (!punchInAt) {
    return {
      punchInAt: null,
      punchOutAt: null,
      earlyMinutes: 0,
      leftEarlyMinutes: 0,
      stayedLateMinutes: 0,
      ...statusWithoutPunch(input.leave ?? 'none', input.dayKind ?? 'WORKING', input.officeEnded !== false),
    };
  }

  const weekday = weekdayForAttendanceDate(input.attendanceDate, schedule.timeZone);
  const officeHours = resolveOfficeHoursForWeekday(schedule, weekday);
  const punchInParts = getZonedParts(punchInAt, schedule.timeZone);
  assertPunchInAllowed(
    schedule,
    punchInParts.minutesFromMidnight,
    officeHours.startMinutes,
    officeHours.endMinutes,
    { allowAfterOfficeEnd: true },
  );
  const derived = evaluateAttendance({
    schedule,
    attendanceDate: input.attendanceDate,
    punchInAt,
    punchOutAt,
    officeStartMinutes: officeHours.startMinutes,
    officeEndMinutes: officeHours.endMinutes,
  });

  return {
    punchInAt,
    punchOutAt,
    status: derived.status,
    workingMinutes: derived.workingMinutes,
    lateMinutes: derived.lateMinutes,
    earlyMinutes: derived.earlyMinutes,
    leftEarlyMinutes: derived.leftEarlyMinutes,
    stayedLateMinutes: derived.stayedLateMinutes,
  };
}

function statusWithoutPunch(
  leave: ApprovedLeaveCoverage,
  dayKind: 'WORKING' | 'HOLIDAY' | 'WEEKLY_OFF',
  officeEnded: boolean,
): Pick<AttendanceCorrectionResult, 'status' | 'workingMinutes' | 'lateMinutes'> {
  if (dayKind === 'HOLIDAY') {
    return { status: 'HOLIDAY', workingMinutes: null, lateMinutes: 0 };
  }
  if (dayKind === 'WEEKLY_OFF') {
    return { status: 'WEEKLY_OFF', workingMinutes: null, lateMinutes: 0 };
  }
  if (leave === 'full') {
    return { status: 'ON_LEAVE', workingMinutes: null, lateMinutes: 0 };
  }
  if (leave === 'half') {
    return { status: 'HALF_DAY', workingMinutes: null, lateMinutes: 0 };
  }
  if (!officeEnded) {
    return { status: 'PENDING', workingMinutes: null, lateMinutes: 0 };
  }
  return { status: 'ABSENT', workingMinutes: null, lateMinutes: 0 };
}
