export type OrgAccessErrorCode =
  | 'NOT_FOUND'
  | 'VALIDATION_FAILED'
  | 'CONFLICT'
  | 'FORBIDDEN'
  | 'MEMBERSHIP_DENIED';

export abstract class OrgAccessError extends Error {
  abstract readonly code: OrgAccessErrorCode;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class OrgAccessNotFoundError extends OrgAccessError {
  readonly code = 'NOT_FOUND';
  constructor(what = 'Resource') {
    super(`${what} was not found.`);
  }
}

export class OrgAccessValidationError extends OrgAccessError {
  readonly code = 'VALIDATION_FAILED';
  constructor(
    message: string,
    readonly details?: readonly { path: string; message: string }[],
  ) {
    super(message);
  }
}

export class OrgAccessConflictError extends OrgAccessError {
  readonly code = 'CONFLICT';
  constructor(message: string) {
    super(message);
  }
}

export class OrgAccessForbiddenError extends OrgAccessError {
  readonly code = 'FORBIDDEN';
  constructor(message = 'You do not have permission to perform this action.') {
    super(message);
  }
}

export class OrgMembershipDeniedError extends OrgAccessError {
  readonly code = 'MEMBERSHIP_DENIED';
  constructor(message = 'Organization membership is not active.') {
    super(message);
  }
}
