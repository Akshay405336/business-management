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

export class LeaveTypeHasDependenciesError extends LeaveError {
  constructor(
    message: string,
    readonly requestCount: number,
    readonly balanceCount: number,
    readonly allocationCount: number,
  ) {
    super(message, 'LEAVE_TYPE_HAS_DEPENDENCIES');
    this.name = 'LeaveTypeHasDependenciesError';
  }
}

export class LeaveBalanceHasDependenciesError extends LeaveError {
  constructor(
    message: string,
    readonly pendingRequestCount: number,
    readonly approvedRequestCount: number,
    readonly consumedBalanceCount: number,
    readonly adjustedBalanceCount: number,
    readonly protectedTransactionCount: number,
  ) {
    super(message, 'LEAVE_BALANCE_HAS_DEPENDENCIES');
    this.name = 'LeaveBalanceHasDependenciesError';
  }
}
