import {
  Catch,
  HttpStatus,
  Inject,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import { API_ERROR_CODES, type ApiErrorCode } from '@techwin/contracts';
import type { Request, Response } from 'express';
import { sendApiError } from '../../../../../common/filters/api-error.response.js';
import {
  AuthAttemptsThrottledError,
  InvalidTotpCodeError,
  PlatformAuthError,
  type PlatformAuthErrorCode,
} from '../../../domain/errors/platform-auth.errors.js';
import { PlatformAuthCookies } from '../cookies/platform-auth.cookies.js';

const HTTP_MAPPING: Record<PlatformAuthErrorCode, { status: number; code: ApiErrorCode }> = {
  INVALID_CREDENTIALS: {
    status: HttpStatus.UNAUTHORIZED,
    code: API_ERROR_CODES.INVALID_CREDENTIALS,
  },
  ACCOUNT_DISABLED: { status: HttpStatus.FORBIDDEN, code: API_ERROR_CODES.ACCOUNT_DISABLED },
  CHALLENGE_EXPIRED: { status: HttpStatus.UNAUTHORIZED, code: API_ERROR_CODES.CHALLENGE_EXPIRED },
  INVALID_TOTP_CODE: { status: HttpStatus.UNAUTHORIZED, code: API_ERROR_CODES.INVALID_TOTP_CODE },
  SESSION_EXPIRED: { status: HttpStatus.UNAUTHORIZED, code: API_ERROR_CODES.SESSION_EXPIRED },
  SESSION_NOT_FOUND: { status: HttpStatus.NOT_FOUND, code: API_ERROR_CODES.SESSION_NOT_FOUND },
  CSRF_REJECTED: { status: HttpStatus.FORBIDDEN, code: API_ERROR_CODES.CSRF_REJECTED },
  ATTEMPTS_THROTTLED: { status: HttpStatus.TOO_MANY_REQUESTS, code: API_ERROR_CODES.RATE_LIMITED },
  INVALID_INPUT: { status: HttpStatus.BAD_REQUEST, code: API_ERROR_CODES.VALIDATION_FAILED },
};

/** Translates auth domain errors into HTTP responses and cleans up dead cookies. */
@Catch(PlatformAuthError)
export class PlatformAuthExceptionFilter implements ExceptionFilter<PlatformAuthError> {
  constructor(@Inject(PlatformAuthCookies) private readonly cookies: PlatformAuthCookies) {}

  catch(error: PlatformAuthError, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const mapping = HTTP_MAPPING[error.code];

    if (error.code === 'CHALLENGE_EXPIRED') this.cookies.clearChallenge(response);
    if (error.code === 'SESSION_EXPIRED') this.cookies.clearSession(response);

    let message = error.message;
    if (error instanceof InvalidTotpCodeError) {
      message = `${error.message} ${error.remainingAttempts} attempt${error.remainingAttempts === 1 ? '' : 's'} remaining.`;
    }

    sendApiError(request, response, {
      status: mapping.status,
      code: mapping.code,
      message,
      retryAfterSeconds:
        error instanceof AuthAttemptsThrottledError ? error.retryAfterSeconds : undefined,
    });
  }
}
