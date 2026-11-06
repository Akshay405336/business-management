import { DailyTaskValidationError } from '../errors/daily-task.errors.js';
import { isoDateOnlyFromDate, parseIsoDateOnly } from '../value-objects/daily-task-date.js';

/** Reschedule must change the calendar assign date (explicit move). */
export function assertRescheduleChangesAssignDate(
  currentAssignDate: Date,
  nextAssignDateIso: string,
): void {
  const next = parseIsoDateOnly(nextAssignDateIso);
  if (isoDateOnlyFromDate(currentAssignDate) === isoDateOnlyFromDate(next)) {
    throw new DailyTaskValidationError('Choose a different assign date to reschedule this task.');
  }
}
