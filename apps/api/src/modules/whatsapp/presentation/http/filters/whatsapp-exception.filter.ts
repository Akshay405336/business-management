import { Catch, HttpStatus, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common';
import { API_ERROR_CODES, type ApiErrorCode } from '@techwin/contracts';
import type { Request, Response } from 'express';
import { sendApiError } from '../../../../../common/filters/api-error.response.js';
import {
  WhatsAppError,
  WhatsAppRateLimitedError,
  type WhatsAppErrorCode,
} from '../../../domain/whatsapp.errors.js';

const HTTP_MAPPING: Record<WhatsAppErrorCode, { status: number; code: ApiErrorCode }> = {
  NOT_FOUND: { status: HttpStatus.NOT_FOUND, code: API_ERROR_CODES.NOT_FOUND },
  VALIDATION_FAILED: { status: HttpStatus.BAD_REQUEST, code: API_ERROR_CODES.VALIDATION_FAILED },
  CONFLICT: { status: HttpStatus.CONFLICT, code: API_ERROR_CODES.BAD_REQUEST },
  FORBIDDEN: { status: HttpStatus.FORBIDDEN, code: API_ERROR_CODES.FORBIDDEN },
  POLICY_BLOCKED: { status: HttpStatus.UNPROCESSABLE_ENTITY, code: API_ERROR_CODES.BAD_REQUEST },
  NOT_CONFIGURED: { status: HttpStatus.PRECONDITION_FAILED, code: API_ERROR_CODES.BAD_REQUEST },
  PROVIDER_ERROR: { status: HttpStatus.BAD_GATEWAY, code: API_ERROR_CODES.SERVICE_UNAVAILABLE },
  RATE_LIMITED: { status: HttpStatus.TOO_MANY_REQUESTS, code: API_ERROR_CODES.RATE_LIMITED },
  UNAUTHORIZED_WEBHOOK: { status: HttpStatus.FORBIDDEN, code: API_ERROR_CODES.FORBIDDEN },
};

@Catch(WhatsAppError)
export class WhatsAppExceptionFilter implements ExceptionFilter<WhatsAppError> {
  catch(error: WhatsAppError, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const mapping = HTTP_MAPPING[error.code];
    sendApiError(request, response, {
      status: mapping.status,
      code: mapping.code,
      message: error.message,
      retryAfterSeconds:
        error instanceof WhatsAppRateLimitedError ? error.retryAfterSeconds : undefined,
    });
  }
}
