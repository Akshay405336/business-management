import type { AttendanceMyTodayResponse } from '@techwin/contracts';

/** Derived from backend `my/today` — single source for UI phase. */
export type EmployeeTodayAttendancePhase = 'not_punched' | 'active' | 'completed';

export function deriveEmployeeTodayPhase(
  today: AttendanceMyTodayResponse | null | undefined,
): EmployeeTodayAttendancePhase {
  const record = today?.record;
  if (!record?.punchInAt) return 'not_punched';
  if (!record.punchOutAt) return 'active';
  return 'completed';
}

export function todayStatusDisplay(today: AttendanceMyTodayResponse): string {
  const record = today.record;
  const phase = deriveEmployeeTodayPhase(today);
  if (phase === 'not_punched') {
    if (today.dayKind === 'HOLIDAY') return 'Holiday';
    if (today.dayKind === 'WEEKLY_OFF') return 'Weekly off';
    return 'Not Punched';
  }
  if (record!.status === 'LATE') return 'Late';
  if (record!.status === 'PRESENT' || record!.status === 'PENDING') return 'Present';
  return record!.status;
}
