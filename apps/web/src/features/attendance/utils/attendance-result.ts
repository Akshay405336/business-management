import type { AttendanceRecordItem, AttendanceStatus } from '@techwin/contracts';
import { formatSpokenDuration } from './time';

export type PunchTimingPreview = {
  status: AttendanceStatus;
  earlyMinutes: number;
  lateMinutes: number;
  leftEarlyMinutes: number;
  stayedLateMinutes: number;
  workingMinutes: number | null;
  punchInAt: string | null;
  punchOutAt: string | null;
};

export function punchInExplanation(input: {
  punchInAt: string | null | undefined;
  earlyMinutes: number;
  lateMinutes: number;
  status: AttendanceStatus;
}): string | null {
  if (input.status === 'ON_LEAVE') return 'Approved leave.';
  if (input.status === 'ABSENT' || !input.punchInAt) {
    if (input.status === 'ABSENT' || input.status === 'PENDING') return 'No punch-in recorded.';
    if (input.status === 'HOLIDAY' || input.status === 'WEEKLY_OFF') return null;
    return 'No punch-in recorded.';
  }
  if (input.earlyMinutes > 0) return `Early by ${formatSpokenDuration(input.earlyMinutes)}`;
  if (input.lateMinutes > 0) return `Late by ${formatSpokenDuration(input.lateMinutes)}`;
  return 'On time';
}

export function punchOutExplanation(input: {
  punchInAt: string | null | undefined;
  punchOutAt: string | null | undefined;
  leftEarlyMinutes: number;
  stayedLateMinutes: number;
  status: AttendanceStatus;
}): string | null {
  if (!input.punchInAt || input.status === 'ABSENT' || input.status === 'ON_LEAVE') return null;
  if (input.status === 'HOLIDAY' || input.status === 'WEEKLY_OFF') return null;
  if (!input.punchOutAt) return 'Not recorded';
  if (input.leftEarlyMinutes > 0) return `Left early by ${formatSpokenDuration(input.leftEarlyMinutes)}`;
  if ((input.stayedLateMinutes ?? 0) > 0) {
    return `Stayed late by ${formatSpokenDuration(input.stayedLateMinutes)}`;
  }
  return 'On time';
}

export function attendanceResultLines(input: PunchTimingPreview): {
  punchIn: string | null;
  punchOut: string | null;
} {
  return {
    punchIn: punchInExplanation(input),
    punchOut: punchOutExplanation(input),
  };
}

/** Compact secondary text for dialogs that cannot use the two-line cell. */
export function attendanceResultDetail(input: PunchTimingPreview): string {
  const lines = attendanceResultLines(input);
  return [lines.punchIn ? `Punch in: ${lines.punchIn}` : null, lines.punchOut ? `Punch out: ${lines.punchOut}` : null]
    .filter(Boolean)
    .join(' · ');
}

export function describeRecordResult(row: AttendanceRecordItem): string {
  return attendanceResultDetail({
    status: row.status,
    earlyMinutes: row.earlyMinutes ?? 0,
    lateMinutes: row.lateMinutes,
    leftEarlyMinutes: row.leftEarlyMinutes ?? 0,
    stayedLateMinutes: row.stayedLateMinutes ?? 0,
    workingMinutes: row.workingMinutes,
    punchInAt: row.punchInAt,
    punchOutAt: row.punchOutAt,
  });
}
