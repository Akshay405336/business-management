import { API_ERROR_CODES } from '@techwin/contracts';
import { isApiError, type ApiError } from './api-error';

let suppressSessionEndedUntil = 0;

/** Prevents global session-ended side effects while sign-in is completing in this tab. */
export function suppressPlatformSessionEndedFor(durationMs: number): void {
  suppressSessionEndedUntil = Date.now() + durationMs;
}

export function shouldSuppressSessionEnded(): boolean {
  return Date.now() < suppressSessionEndedUntil;
}

export function shouldNotifySessionEnded(error: ApiError): boolean {
  return error.code === API_ERROR_CODES.SESSION_EXPIRED;
}

/** True when the HTTP error means the platform session is gone (not permissions, validation, or network). */
export function isDefinitiveSessionEnd(error: unknown): boolean {
  if (!isApiError(error) || error.kind !== 'http') return false;
  switch (error.code) {
    case API_ERROR_CODES.SESSION_EXPIRED:
    case API_ERROR_CODES.SESSION_NOT_FOUND:
      return true;
    case API_ERROR_CODES.UNAUTHENTICATED:
    case API_ERROR_CODES.ACCESS_TOKEN_INVALID:
      // Missing bearer on `/me` is not always a revoked session (e.g. chunk-split token store).
      return false;
    default:
      return false;
  }
}
