export class LeaveError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = 'LeaveError';
  }
}

export class LeaveNotFoundError extends LeaveError {
  constructor(entity = 'Leave record') {
    super(`${entity} was not found.`, 'LEAVE_NOT_FOUND');
    this.name = 'LeaveNotFoundError';
  }
}

export class LeaveForbiddenError extends LeaveError {
  constructor(message = 'Leave action is not allowed.') {
    super(message, 'LEAVE_FORBIDDEN');
    this.name = 'LeaveForbiddenError';
  }
}

export class LeaveConflictError extends LeaveError {
  constructor(message: string) {
    super(message, 'LEAVE_CONFLICT');
    this.name = 'LeaveConflictError';
  }
}

export class LeaveValidationError extends LeaveError {
  constructor(message: string) {
    super(message, 'LEAVE_VALIDATION');
    this.name = 'LeaveValidationError';
  }
}
