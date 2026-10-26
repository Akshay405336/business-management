export type EmployeeErrorCode = 'NOT_FOUND' | 'VALIDATION_FAILED' | 'CONFLICT';

export abstract class EmployeeError extends Error {
  abstract readonly code: EmployeeErrorCode;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class EmployeeNotFoundError extends EmployeeError {
  readonly code = 'NOT_FOUND';
  constructor() {
    super('Employee was not found.');
  }
}

export class EmployeeValidationError extends EmployeeError {
  readonly code = 'VALIDATION_FAILED';
  constructor(
    message: string,
    readonly details?: readonly { path: string; message: string }[],
  ) {
    super(message);
  }
}

export class EmployeeConflictError extends EmployeeError {
  readonly code = 'CONFLICT';
  constructor(message: string) {
    super(message);
  }
}
