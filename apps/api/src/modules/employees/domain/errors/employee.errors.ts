import type { EmployeeDailyTaskDeletionImpact } from '../types/employee.types.js';

export type EmployeeErrorCode = 'NOT_FOUND' | 'VALIDATION_FAILED' | 'CONFLICT';

export abstract class EmployeeError extends Error {
  abstract readonly code: EmployeeErrorCode;
  abstract readonly reason: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class EmployeeNotFoundError extends EmployeeError {
  readonly code = 'NOT_FOUND' as const;
  readonly reason = 'EMPLOYEE_NOT_FOUND' as const;
  constructor() {
    super('Employee was not found.');
  }
}

export class EmployeeValidationError extends EmployeeError {
  readonly code = 'VALIDATION_FAILED' as const;
  readonly reason: string = 'EMPLOYEE_VALIDATION_FAILED';
  constructor(
    message: string,
    readonly details?: readonly { path: string; message: string }[],
  ) {
    super(message);
  }
}

export class EmployeeConflictError extends EmployeeError {
  readonly code = 'CONFLICT' as const;
  readonly reason = 'EMPLOYEE_CONFLICT' as const;
  constructor(message: string) {
    super(message);
  }
}

export class EmployeeHasPendingTasksError extends EmployeeError {
  readonly code = 'CONFLICT' as const;
  readonly reason = 'EMPLOYEE_HAS_PENDING_TASKS' as const;
  constructor(readonly impact: EmployeeDailyTaskDeletionImpact) {
    super('This employee cannot be deleted because they have unfinished assigned tasks.');
  }
}

export class EmployeeCodeInvalidError extends EmployeeValidationError {
  override readonly reason = 'EMPLOYEE_CODE_INVALID' as const;
  constructor() {
    super('Employee code is invalid.');
  }
}

export class EmployeeStatusTransitionInvalidError extends EmployeeValidationError {
  override readonly reason = 'EMPLOYEE_STATUS_TRANSITION_INVALID' as const;
  constructor() {
    super('Unsupported employment status.');
  }
}

export class EmployeeCompensationInvalidError extends EmployeeValidationError {
  override readonly reason = 'EMPLOYEE_COMPENSATION_INVALID' as const;
  constructor(message: string) {
    super(message);
  }
}
