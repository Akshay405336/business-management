import { DailyTaskValidationError } from '../errors/daily-task.errors.js';
import { assertUpdateDateOrdering } from './daily-task-date-order.policy.js';
import type { UpdateDailyTaskInput } from '../types/daily-task-inputs.js';

type ExistingTaskShape = {
  readonly assignDate: Date;
  readonly dueDate: Date | null;
};

/** Cross-field rules for task updates that are not covered by HTTP request schemas. */
export function assertUpdateDailyTaskInput(
  existing: ExistingTaskShape,
  input: UpdateDailyTaskInput,
): void {
  if (input.employeeIds !== undefined && input.employeeIds.length === 0) {
    throw new DailyTaskValidationError('Assign at least one employee.');
  }
  assertUpdateDateOrdering({
    existingAssignDate: existing.assignDate,
    existingDueDate: existing.dueDate,
    patchAssignDate: input.assignDate,
    patchDueDate: input.dueDate,
  });
}
