import { DailyTaskValidationError } from '../errors/daily-task.errors.js';
import { isoDateOnlyFromDate, parseIsoDateOnly } from '../value-objects/daily-task-date.js';

export function assertDueOnOrAfterAssign(assignDateIso: string, dueDateIso: string | null | undefined): void {
  if (!dueDateIso) return;
  if (dueDateIso >= assignDateIso) return;
  throw new DailyTaskValidationError('Due date must be on or after the assign date.');
}

export function assertDueOnOrAfterAssignFromDates(
  assignDate: Date,
  dueDate: Date | null | undefined,
): void {
  if (!dueDate) return;
  const assignKey = isoDateOnlyFromDate(assignDate);
  const dueKey = isoDateOnlyFromDate(dueDate);
  assertDueOnOrAfterAssign(assignKey, dueKey);
}

/** When patching assign/due dates on update, enforce ordering against resolved final dates. */
export function assertUpdateDateOrdering(input: {
  readonly existingAssignDate: Date;
  readonly existingDueDate: Date | null;
  readonly patchAssignDate?: string;
  readonly patchDueDate?: string | null;
}): void {
  const nextAssign = input.patchAssignDate
    ? parseIsoDateOnly(input.patchAssignDate)
    : input.existingAssignDate;
  let nextDue: Date | null | undefined =
    input.patchDueDate === undefined ? input.existingDueDate : input.patchDueDate
      ? parseIsoDateOnly(input.patchDueDate)
      : null;
  if (input.patchDueDate === undefined) {
    nextDue = input.existingDueDate;
  }
  assertDueOnOrAfterAssignFromDates(nextAssign, nextDue);
}
