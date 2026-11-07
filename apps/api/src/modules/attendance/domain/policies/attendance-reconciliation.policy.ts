import type { AttendanceStatus } from '../enums/attendance-status.enum.js';

export const AUTO_ABSENT_NOTE = 'Marked absent after attendance cutoff.';
export const AUTO_LEAVE_NOTE = 'Marked on leave from approved leave.';
export const AUTO_HALF_LEAVE_NOTE = 'Approved half-day leave.';

const AUTOMATIC_NOTES = new Set([AUTO_ABSENT_NOTE, AUTO_LEAVE_NOTE, AUTO_HALF_LEAVE_NOTE]);

export type ApprovedLeaveCoverage = 'none' | 'full' | 'half';

export type ApprovedLeaveDay = {
  readonly isHalfDay: boolean;
  readonly halfDayDate: string | null;
  readonly selectedDates: readonly string[];
};

export type AbsenceReconciliationInput = {
  readonly hasPunchIn: boolean;
  readonly hasCorrections: boolean;
  readonly status: AttendanceStatus | null;
  readonly finalizationNote: string | null;
  readonly finalized: boolean;
  readonly leave: ApprovedLeaveCoverage;
};

export type AbsenceReconciliationDecision =
  | { readonly action: 'skip' }
  | { readonly action: 'upsert'; readonly status: 'ABSENT' | 'ON_LEAVE' | 'HALF_DAY'; readonly note: string };

export function isAutomaticFinalizationNote(note: string | null): boolean {
  return note != null && AUTOMATIC_NOTES.has(note);
}

/** Approved leave covering one attendance date. Full-day leave wins over a half-day request. */
export function classifyApprovedLeaveForDate(
  requests: readonly ApprovedLeaveDay[],
  dateKey: string,
): ApprovedLeaveCoverage {
  let sawHalf = false;
  for (const request of requests) {
    if (request.selectedDates.length > 0 && !request.selectedDates.includes(dateKey)) continue;
    const halfOnThisDate =
      request.isHalfDay &&
      (request.halfDayDate === dateKey ||
        (request.halfDayDate == null && request.selectedDates.length <= 1));
    if (halfOnThisDate) {
      sawHalf = true;
      continue;
    }
    return 'full';
  }
  return sawHalf ? 'half' : 'none';
}

/**
 * Decides whether automatic reconciliation may create or replace a no-punch record.
 * Manual corrections and punch-in records are left untouched. Punch-out is never invented.
 */
export function decideAbsenceReconciliation(
  input: AbsenceReconciliationInput,
): AbsenceReconciliationDecision {
  if (input.hasPunchIn || input.hasCorrections) return { action: 'skip' };
  if (input.status === 'HOLIDAY' || input.status === 'WEEKLY_OFF') return { action: 'skip' };

  const automatic = isAutomaticFinalizationNote(input.finalizationNote);
  const manualFinalized =
    input.finalized && input.status != null && input.status !== 'PENDING' && !automatic;
  if (manualFinalized) return { action: 'skip' };

  if (input.leave === 'full') {
    if (input.status === 'ON_LEAVE' && input.finalizationNote === AUTO_LEAVE_NOTE) {
      return { action: 'skip' };
    }
    return { action: 'upsert', status: 'ON_LEAVE', note: AUTO_LEAVE_NOTE };
  }

  if (input.leave === 'half') {
    if (input.status === 'HALF_DAY' && input.finalizationNote === AUTO_HALF_LEAVE_NOTE) {
      return { action: 'skip' };
    }
    return { action: 'upsert', status: 'HALF_DAY', note: AUTO_HALF_LEAVE_NOTE };
  }

  if (input.status === 'ABSENT' && input.finalizationNote === AUTO_ABSENT_NOTE) {
    return { action: 'skip' };
  }
  return { action: 'upsert', status: 'ABSENT', note: AUTO_ABSENT_NOTE };
}
