import { API_ERROR_CODES } from '@techwin/contracts';
import { isApiError } from '@/shared/api/api-error';
import type { LoginNoticeReason } from '../types/auth.types';

function retryHint(seconds: number | null): string {
  if (!seconds) return 'Please wait a moment and try again.';
  const minutes = Math.ceil(seconds / 60);
  return seconds < 90
    ? `Try again in ${seconds} seconds.`
    : `Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`;
}

/** User-facing message for a failed sign-in or verification request. */
export function describeAuthError(error: unknown): string {
  if (!isApiError(error)) return 'Something went wrong. Please try again.';
  if (error.kind === 'network')
    return 'Unable to reach the server. Check your connection and try again.';
  if (error.kind === 'timeout') return 'The server took too long to respond. Please try again.';

  switch (error.code) {
    case API_ERROR_CODES.INVALID_CREDENTIALS:
      return 'The email or password is incorrect.';
    case API_ERROR_CODES.INVALID_TOTP_CODE:
      return error.message;
    case API_ERROR_CODES.ACCOUNT_DISABLED:
      return 'This account is disabled. Contact another administrator.';
    case API_ERROR_CODES.RATE_LIMITED:
      return `Too many attempts. ${retryHint(error.retryAfterSeconds)}`;
    case API_ERROR_CODES.VALIDATION_FAILED:
      return 'Please check the highlighted fields.';
    case API_ERROR_CODES.CSRF_REJECTED:
      return 'Your request could not be verified. Reload the page and try again.';
    default:
      return error.status !== null && error.status >= 500
        ? 'The service is temporarily unavailable. Please try again shortly.'
        : error.message;
  }
}

export const isChallengeExpired = (error: unknown): boolean =>
  isApiError(error) && error.code === API_ERROR_CODES.CHALLENGE_EXPIRED;

export const isInvalidTotpCode = (error: unknown): boolean =>
  isApiError(error) && error.code === API_ERROR_CODES.INVALID_TOTP_CODE;

const LOGIN_NOTICES: Record<LoginNoticeReason, string> = {
  challenge_expired: 'Your verification step expired. Sign in again to get a new code prompt.',
  session_expired: 'Your session has ended. Please sign in again.',
  signed_out: 'You have been signed out.',
};

export function parseLoginNotice(value: unknown): LoginNoticeReason | null {
  return typeof value === 'string' && value in LOGIN_NOTICES ? (value as LoginNoticeReason) : null;
}

export const loginNoticeMessage = (reason: LoginNoticeReason): string => LOGIN_NOTICES[reason];

export function loginPath(reason?: LoginNoticeReason): string {
  return reason ? `/admin/login?reason=${reason}` : '/admin/login';
}
