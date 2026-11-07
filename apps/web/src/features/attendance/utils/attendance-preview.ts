import type { AttendanceStatus } from '@techwin/contracts';
import { minutesToLabel } from './time';

/** Display-only mirror of the domain punch rules. The API recalculates on save. */
export function previewPunchAttendance(input: {
  officeStartMinutes: number;
  officeEndMinutes: number;
  lateGraceMinutes: number;
  earlyPunchInAllowanceMinutes: number;
  minHalfDayMinutes: number;
  punchInMinutes: number | null;
  punchOutMinutes: number | null;
}): {
  status: AttendanceStatus;
  earlyMinutes: number;
  lateMinutes: number;
  leftEarlyMinutes: number;
  stayedLateMinutes: number;
  workingMinutes: number | null;
  rejection: string | null;
} {
  if (input.punchInMinutes == null) {
    return {
      status: 'PENDING',
      earlyMinutes: 0,
      lateMinutes: 0,
      leftEarlyMinutes: 0,
      stayedLateMinutes: 0,
      workingMinutes: null,
      rejection: null,
    };
  }
  const earliest = input.officeStartMinutes - input.earlyPunchInAllowanceMinutes;
  if (input.punchInMinutes < earliest) {
    return {
      status: 'PENDING',
      earlyMinutes: 0,
      lateMinutes: 0,
      leftEarlyMinutes: 0,
      stayedLateMinutes: 0,
      workingMinutes: null,
      rejection: `Punch-in is not allowed before ${minutesToLabel(earliest)}.`,
    };
  }
  const lateThreshold = input.officeStartMinutes + input.lateGraceMinutes;
  const lateMinutes = input.punchInMinutes > lateThreshold ? input.punchInMinutes - lateThreshold : 0;
  const earlyMinutes =
    input.punchInMinutes < input.officeStartMinutes ? input.officeStartMinutes - input.punchInMinutes : 0;
  const punchStatus: AttendanceStatus = lateMinutes > 0 ? 'LATE' : 'PRESENT';
  if (input.punchOutMinutes == null || input.punchOutMinutes <= input.punchInMinutes) {
    return {
      status: punchStatus,
      earlyMinutes,
      lateMinutes,
      leftEarlyMinutes: 0,
      stayedLateMinutes: 0,
      workingMinutes: null,
      rejection: null,
    };
  }
  const workingMinutes = input.punchOutMinutes - input.punchInMinutes;
  const leftEarlyMinutes =
    input.punchOutMinutes < input.officeEndMinutes ? input.officeEndMinutes - input.punchOutMinutes : 0;
  const stayedLateMinutes =
    input.punchOutMinutes > input.officeEndMinutes ? input.punchOutMinutes - input.officeEndMinutes : 0;
  const status: AttendanceStatus = workingMinutes < input.minHalfDayMinutes ? 'HALF_DAY' : punchStatus;
  return {
    status,
    earlyMinutes,
    lateMinutes,
    leftEarlyMinutes,
    stayedLateMinutes,
    workingMinutes,
    rejection: null,
  };
}
