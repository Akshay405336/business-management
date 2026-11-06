import { DailyTaskValidationError } from '../errors/daily-task.errors.js';
import { assertDueOnOrAfterAssign } from './daily-task-date-order.policy.js';
import type { CreateDailyTaskInput } from '../types/daily-task-inputs.js';

/** Rules enforced on create beyond HTTP-layer validation. */
export function assertCreateDailyTaskBusinessRules(input: CreateDailyTaskInput): void {
  if (input.employeeIds.length === 0) {
    throw new DailyTaskValidationError('Assign at least one employee.');
  }
  assertDueOnOrAfterAssign(input.assignDate, input.dueDate ?? null);
}
