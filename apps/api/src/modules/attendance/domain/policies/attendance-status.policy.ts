import { AttendancePolicyError } from '../errors/attendance.errors.js';
import type { AttendanceStatus } from '../enums/attendance-status.enum.js';
import {
  diffMinutes,
  formatDateOnly,
  formatMinutesClock,
  getZonedParts,
  type ZonedDateParts,
} from '../services/attendance-time.service.js';
import type { AttendanceScheduleConfig } from '../types/attendance-schedule.types.js';

/**
 * One attendance calculation for punch-in, punch-out, admin create, admin edit,
 * and automatic reconciliation. Values come from persisted Attendance Settings.
 *
 * Punch window:
 * - Earliest allowed punch-in = office start − early allowance, inclusive.
 * - Late threshold = office start + grace, inclusive for Present.
 * - Any punch-in after the threshold is Late by the minutes past the threshold.
 * - A punch before the earliest allowed time is rejected and is not saved.
 * - Employee punch-in after office end is rejected. Admin historical correction
 *   may still record a punch after office end.
 *
 * Status precedence after leave and calendar classification:
 * 1. Approved full-day leave with no punch = ON_LEAVE.
 * 2. No punch after office end, no approved leave = ABSENT.
 * 3. Completed working duration strictly below minHalfDayMinutes = HALF_DAY.
 * 4. Completed duration at or above minHalfDayMinutes = PRESENT or LATE from punch-in.
 * 5. Punch-in without punch-out stays PRESENT or LATE. Punch-out is never invented.
 *
 * Exactly minHalfDayMinutes qualifies for Present or Late. minFullDayMinutes is
 * persisted and snapshotted with the schedule so later punches use the saved
 * value; it is not a second status branch.
 *
 * Early arrival, late arrival, early departure, and stayed-late are independent
 * of punch-in status. Early arrival does not add credited working hours.
 * Punch-in late/early and punch-out left-early/stayed-late are separate.
 */
export type AttendanceEvaluation = {
  readonly status: AttendanceStatus;
  readonly earlyMinutes: number;
  readonly lateMinutes: number;
  readonly leftEarlyMinutes: number;
  readonly stayedLateMinutes: number;
  readonly workingMinutes: number | null;
  readonly appliedMinHalfDayMinutes: number;
  readonly appliedMinFullDayMinutes: number;
};

export type AttendanceEvaluationInput = {
  readonly schedule: Pick<
    AttendanceScheduleConfig,
    'lateGraceMinutes' | 'minHalfDayMinutes' | 'minFullDayMinutes' | 'timeZone'
  >;
  readonly attendanceDate: string;
  readonly punchInAt: Date | null;
  readonly punchOutAt: Date | null;
  readonly officeStartMinutes: number;
  readonly officeEndMinutes: number;
};

export function earliestPunchInMinutes(
  officeStartMinutes: number,
  earlyPunchInAllowanceMinutes: number,
): number {
  return officeStartMinutes - earlyPunchInAllowanceMinutes;
}

export function lateThresholdMinutes(officeStartMinutes: number, lateGraceMinutes: number): number {
  return officeStartMinutes + lateGraceMinutes;
}

export function assertPunchInAllowed(
  schedule: Pick<AttendanceScheduleConfig, 'earlyPunchInAllowanceMinutes'>,
  minutesFromMidnight: number,
  officeStartMinutes: number,
  officeEndMinutes: number,
  options: { readonly allowAfterOfficeEnd?: boolean } = {},
): void {
  const earliest = earliestPunchInMinutes(officeStartMinutes, schedule.earlyPunchInAllowanceMinutes);
  if (minutesFromMidnight < earliest) {
    throw new AttendancePolicyError(
      `Punch-in is not allowed before ${formatMinutesClock(earliest)}.`,
    );
  }
  if (!options.allowAfterOfficeEnd && minutesFromMidnight > officeEndMinutes) {
    throw new AttendancePolicyError(
      `Punch-in is not allowed after office end (${formatMinutesClock(officeEndMinutes)}).`,
    );
  }
}

function emptyPunchOutTiming(): { leftEarlyMinutes: number; stayedLateMinutes: number } {
  return { leftEarlyMinutes: 0, stayedLateMinutes: 0 };
}

/**
 * Punch-out vs saved office end on the attendance date. Independent of punch-in.
 * Same calendar date: minutes before end = left early; minutes after = stayed late.
 * A later calendar date counts as stayed late through midnight.
 */
export function punchOutVersusOfficeEnd(
  punchOut: ZonedDateParts,
  attendanceDate: string,
  officeEndMinutes: number,
): { leftEarlyMinutes: number; stayedLateMinutes: number } {
  const punchOutDate = formatDateOnly(punchOut);
  if (punchOutDate === attendanceDate) {
    if (punchOut.minutesFromMidnight < officeEndMinutes) {
      return {
        leftEarlyMinutes: officeEndMinutes - punchOut.minutesFromMidnight,
        stayedLateMinutes: 0,
      };
    }
    return {
      leftEarlyMinutes: 0,
      stayedLateMinutes: punchOut.minutesFromMidnight - officeEndMinutes,
    };
  }
  if (punchOutDate > attendanceDate) {
    const start = Date.UTC(
      Number(attendanceDate.slice(0, 4)),
      Number(attendanceDate.slice(5, 7)) - 1,
      Number(attendanceDate.slice(8, 10)),
    );
    const end = Date.UTC(punchOut.year, punchOut.month - 1, punchOut.day);
    const extraDays = Math.max(0, Math.round((end - start) / 86_400_000));
    return {
      leftEarlyMinutes: 0,
      stayedLateMinutes: extraDays * 24 * 60 - officeEndMinutes + punchOut.minutesFromMidnight,
    };
  }
  return emptyPunchOutTiming();
}

export function evaluateAttendance(input: AttendanceEvaluationInput): AttendanceEvaluation {
  const appliedMinHalfDayMinutes = input.schedule.minHalfDayMinutes;
  const appliedMinFullDayMinutes = input.schedule.minFullDayMinutes;
  if (!input.punchInAt) {
    return {
      status: 'ABSENT',
      earlyMinutes: 0,
      lateMinutes: 0,
      ...emptyPunchOutTiming(),
      workingMinutes: null,
      appliedMinHalfDayMinutes,
      appliedMinFullDayMinutes,
    };
  }

  const punchIn = getZonedParts(input.punchInAt, input.schedule.timeZone);
  const earlyMinutes =
    punchIn.minutesFromMidnight < input.officeStartMinutes
      ? input.officeStartMinutes - punchIn.minutesFromMidnight
      : 0;
  const threshold = lateThresholdMinutes(input.officeStartMinutes, input.schedule.lateGraceMinutes);
  const lateMinutes =
    punchIn.minutesFromMidnight > threshold ? punchIn.minutesFromMidnight - threshold : 0;
  const punchStatus: AttendanceStatus = lateMinutes > 0 ? 'LATE' : 'PRESENT';

  if (!input.punchOutAt) {
    return {
      status: punchStatus,
      earlyMinutes,
      lateMinutes,
      ...emptyPunchOutTiming(),
      workingMinutes: null,
      appliedMinHalfDayMinutes,
      appliedMinFullDayMinutes,
    };
  }

  const punchOut = getZonedParts(input.punchOutAt, input.schedule.timeZone);
  const punchOutTiming = punchOutVersusOfficeEnd(punchOut, input.attendanceDate, input.officeEndMinutes);
  const workingMinutes = diffMinutes(input.punchInAt, input.punchOutAt);
  const status: AttendanceStatus =
    workingMinutes < appliedMinHalfDayMinutes ? 'HALF_DAY' : punchStatus;

  return {
    status,
    earlyMinutes,
    lateMinutes,
    leftEarlyMinutes: punchOutTiming.leftEarlyMinutes,
    stayedLateMinutes: punchOutTiming.stayedLateMinutes,
    workingMinutes,
    appliedMinHalfDayMinutes,
    appliedMinFullDayMinutes,
  };
}
