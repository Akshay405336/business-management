export type DailyTaskErrorCode = 'NOT_FOUND' | 'VALIDATION_FAILED' | 'CONFLICT';

export class DailyTaskError extends Error {
  constructor(
    message: string,
    readonly code: DailyTaskErrorCode,
  ) {
    super(message);
    this.name = 'DailyTaskError';
  }
}

export class DailyTaskNotFoundError extends DailyTaskError {
  constructor() {
    super('Daily task not found.', 'NOT_FOUND');
  }
}

export class DailyTaskValidationError extends DailyTaskError {
  constructor(
    message: string,
    readonly details?: readonly { readonly path: string; readonly message: string }[],
  ) {
    super(message, 'VALIDATION_FAILED');
  }
}

export class DailyTaskConflictError extends DailyTaskError {
  constructor(message: string) {
    super(message, 'CONFLICT');
  }
}
