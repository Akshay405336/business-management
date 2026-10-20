/**
 * Stable, machine-readable error codes returned by the API. Clients must branch
 * on these codes rather than on human-readable messages.
 */
export const API_ERROR_CODES = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  ACCESS_TOKEN_INVALID: 'ACCESS_TOKEN_INVALID',
  FORBIDDEN: 'FORBIDDEN',
  CSRF_REJECTED: 'CSRF_REJECTED',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMITED: 'RATE_LIMITED',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',

  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
  CHALLENGE_EXPIRED: 'CHALLENGE_EXPIRED',
  INVALID_TOTP_CODE: 'INVALID_TOTP_CODE',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];

export interface ApiErrorDetail {
  /** Dot-separated path of the offending field, when applicable. */
  readonly path: string;
  readonly message: string;
}

export interface ApiErrorBody {
  readonly code: ApiErrorCode;
  readonly message: string;
  readonly requestId: string | null;
  readonly details?: readonly ApiErrorDetail[];
  /** Seconds the client should wait before retrying (rate limiting only). */
  readonly retryAfterSeconds?: number;
}

export interface ApiErrorResponse {
  readonly statusCode: number;
  readonly error: ApiErrorBody;
}
