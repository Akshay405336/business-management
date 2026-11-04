import type { AttendanceScheduleSnapshot } from '../read-models/attendance.models.js';
import { AttendancePolicyError } from '../errors/attendance.errors.js';
import type { AttendanceStatus } from '../enums/attendance-status.enum.js';
import {
  calculateFinalStatus,
  calculatePunchInStatus,
} from './attendance-status.policy.js';
import {
  getZonedParts,
  resolveOfficeHoursForWeekday,
} from '../services/attendance-time.service.js';
import type { AttendanceScheduleConfig } from '../types/attendance-schedule.types.js';
import type { CorrectAttendanceRecordInput } from '../types/attendance-inputs.js';

export type AttendanceCorrectionResult = {
  readonly punchInAt: Date | null;
  readonly punchOutAt: Date | null;
  readonly status: AttendanceStatus;
  readonly workingMinutes: number | null;
  readonly lateMinutes: number;
};

const SCHEDULE_INDEPENDENT_STATUSES: readonly AttendanceStatus[] = [
  'HOLIDAY',
  'WEEKLY_OFF',
  'ON_LEAVE',
  'PENDING',
];

const PUNCH_REQUIRED_STATUSES: readonly AttendanceStatus[] = ['PRESENT', 'LATE', 'HALF_DAY'];

function snapshotToScheduleConfig(snapshot: AttendanceScheduleSnapshot): AttendanceScheduleConfig {
  return {
    scheduleId: snapshot.scheduleId,
    timeZone: snapshot.timeZone,
    officeStartMinutes: snapshot.officeStartMinutes,
    officeEndMinutes: snapshot.officeEndMinutes,
    lateGraceMinutes: snapshot.lateGraceMinutes,
    attendanceCutoffMinutes: snapshot.attendanceCutoffMinutes,
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

export function applyAttendanceCorrection(input: {
  readonly attendanceDate: string;
  readonly scheduleSnapshot: AttendanceScheduleSnapshot;
  readonly current: {
    readonly punchInAt: Date | null;
    readonly punchOutAt: Date | null;
    readonly status: AttendanceStatus;
  };
  readonly patch: CorrectAttendanceRecordInput;
}): AttendanceCorrectionResult {
  const punchInAt = resolveTimestamp(input.patch.punchInAt, input.current.punchInAt);
  const punchOutAt = resolveTimestamp(input.patch.punchOutAt, input.current.punchOutAt);
  const requestedStatus = input.patch.status;

  if (punchInAt && punchOutAt && punchOutAt.getTime() <= punchInAt.getTime()) {
    throw new AttendancePolicyError('Punch out must be after punch in.');
  }

  if (requestedStatus && SCHEDULE_INDEPENDENT_STATUSES.includes(requestedStatus)) {
    return {
      punchInAt,
      punchOutAt,
      status: requestedStatus,
      workingMinutes:
        punchInAt && punchOutAt
          ? Math.max(0, Math.floor((punchOutAt.getTime() - punchInAt.getTime()) / 60_000))
          : null,
      lateMinutes: 0,
    };
  }

  if (requestedStatus === 'ABSENT') {
    const clearedIn = input.patch.punchInAt === null ? null : punchInAt;
    const clearedOut = input.patch.punchOutAt === null ? null : punchOutAt;
    if (clearedIn && clearedOut && clearedOut.getTime() <= clearedIn.getTime()) {
      throw new AttendancePolicyError('Punch out must be after punch in.');
    }
    return {
      punchInAt: clearedIn,
      punchOutAt: clearedOut,
      status: 'ABSENT',
      workingMinutes: null,
      lateMinutes: 0,
    };
  }

  if (!punchInAt) {
    if (requestedStatus && PUNCH_REQUIRED_STATUSES.includes(requestedStatus)) {
      throw new AttendancePolicyError('Punch in is required for the selected status.');
    }
    return {
      punchInAt: null,
      punchOutAt: punchOutAt,
      status: requestedStatus ?? 'ABSENT',
      workingMinutes: null,
      lateMinutes: 0,
    };
  }

  const schedule = snapshotToScheduleConfig(input.scheduleSnapshot);
  const timeZone = schedule.timeZone;
  const weekday = weekdayForAttendanceDate(input.attendanceDate, timeZone);
  const officeHours = resolveOfficeHoursForWeekday(schedule, weekday);
  const punchInParts = getZonedParts(punchInAt, timeZone);
  const punchInEval = calculatePunchInStatus(
    schedule,
    punchInParts.minutesFromMidnight,
    officeHours.startMinutes,
  );
  const derived = calculateFinalStatus(
    schedule,
    punchInAt,
    punchOutAt,
    punchInEval.lateMinutes,
    punchInEval.status,
  );

  if (requestedStatus && requestedStatus !== derived.status) {
    throw new AttendancePolicyError(
      `The selected status does not match punch times. Expected ${derived.status.replace('_', ' ')}.`,
    );
  }

  return {
    punchInAt,
    punchOutAt,
    status: derived.status,
    workingMinutes: derived.workingMinutes,
    lateMinutes: derived.lateMinutes,
  };
}
