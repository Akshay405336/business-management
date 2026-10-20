export type PlatformAuthErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'ACCOUNT_DISABLED'
  | 'CHALLENGE_EXPIRED'
  | 'INVALID_TOTP_CODE'
  | 'SESSION_EXPIRED'
  | 'SESSION_NOT_FOUND'
  | 'CSRF_REJECTED'
  | 'ATTEMPTS_THROTTLED'
  | 'INVALID_INPUT';

export abstract class PlatformAuthError extends Error {
  abstract readonly code: PlatformAuthErrorCode;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** Deliberately generic: never reveals whether the email or the password was wrong. */
export class InvalidCredentialsError extends PlatformAuthError {
  readonly code = 'INVALID_CREDENTIALS';
  constructor() {
    super('The email or password is incorrect.');
  }
}

export class AccountDisabledError extends PlatformAuthError {
  readonly code = 'ACCOUNT_DISABLED';
  constructor() {
    super('This administrator account is disabled.');
  }
}

export class AuthChallengeExpiredError extends PlatformAuthError {
  readonly code = 'CHALLENGE_EXPIRED';
  constructor() {
    super('Your sign-in attempt has expired. Please sign in again.');
  }
}

export class InvalidTotpCodeError extends PlatformAuthError {
  readonly code = 'INVALID_TOTP_CODE';
  constructor(readonly remainingAttempts: number) {
    super('The verification code is incorrect.');
  }
}

export class SessionExpiredError extends PlatformAuthError {
  readonly code = 'SESSION_EXPIRED';
  constructor() {
    super('Your session has expired. Please sign in again.');
  }
}

export class SessionNotFoundError extends PlatformAuthError {
  readonly code = 'SESSION_NOT_FOUND';
  constructor() {
    super('The session was not found.');
  }
}

export class CsrfTokenMismatchError extends PlatformAuthError {
  readonly code = 'CSRF_REJECTED';
  constructor() {
    super('The request could not be verified.');
  }
}

export class AuthAttemptsThrottledError extends PlatformAuthError {
  readonly code = 'ATTEMPTS_THROTTLED';
  constructor(readonly retryAfterSeconds: number) {
    super('Too many attempts. Please wait before trying again.');
  }
}

export class InvalidAuthInputError extends PlatformAuthError {
  readonly code = 'INVALID_INPUT';
}
