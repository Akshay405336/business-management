import type { AttendanceStatus } from '../enums/attendance-status.enum.js';
import { diffMinutes } from '../services/attendance-time.service.js';
import type { AttendanceScheduleConfig } from '../types/attendance-schedule.types.js';

export function calculatePunchInStatus(
  schedule: AttendanceScheduleConfig,
  minutesFromMidnight: number,
  officeStartMinutes: number = schedule.officeStartMinutes,
): { status: AttendanceStatus; lateMinutes: number } {
  const allowedEarliest = officeStartMinutes - schedule.earlyPunchInAllowanceMinutes;
  if (minutesFromMidnight < allowedEarliest) {
    return { status: 'PRESENT', lateMinutes: 0 };
  }
  const lateThreshold = officeStartMinutes + schedule.lateGraceMinutes;
  if (minutesFromMidnight <= lateThreshold) {
    return { status: 'PRESENT', lateMinutes: 0 };
  }
  const lateMinutes = Math.max(0, minutesFromMidnight - officeStartMinutes);
  return { status: 'LATE', lateMinutes };
}

export function calculateFinalStatus(
  schedule: AttendanceScheduleConfig,
  punchInAt: Date | null,
  punchOutAt: Date | null,
  punchInLateMinutes: number,
  punchInStatus: AttendanceStatus,
): { status: AttendanceStatus; workingMinutes: number | null; lateMinutes: number } {
  if (!punchInAt) {
    return { status: 'ABSENT', workingMinutes: null, lateMinutes: 0 };
  }
  if (!punchOutAt) {
    return {
      status: punchInStatus === 'LATE' ? 'LATE' : punchInStatus,
      workingMinutes: null,
      lateMinutes: punchInLateMinutes,
    };
  }
  const workingMinutes = diffMinutes(punchInAt, punchOutAt);
  let status: AttendanceStatus = punchInStatus;
  if (workingMinutes < schedule.minHalfDayMinutes) {
    status = 'HALF_DAY';
  } else if (workingMinutes < schedule.minFullDayMinutes) {
    status = punchInStatus === 'LATE' ? 'LATE' : 'HALF_DAY';
  } else if (punchInStatus === 'LATE') {
    status = 'LATE';
  } else {
    status = 'PRESENT';
  }
  return { status, workingMinutes, lateMinutes: punchInLateMinutes };
}
