import {
  Catch,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import { API_ERROR_CODES, type ApiErrorCode } from '@techwin/contracts';
import type { Request, Response } from 'express';
import { sendApiError } from '../../../../../common/filters/api-error.response.js';
import {
  OrgAccessError,
  OrgAccessValidationError,
  type OrgAccessErrorCode,
} from '../../../domain/errors/org-access.errors.js';

const HTTP_MAPPING: Record<OrgAccessErrorCode, { status: number; code: ApiErrorCode }> = {
  NOT_FOUND: { status: HttpStatus.NOT_FOUND, code: API_ERROR_CODES.NOT_FOUND },
  VALIDATION_FAILED: {
    status: HttpStatus.BAD_REQUEST,
    code: API_ERROR_CODES.VALIDATION_FAILED,
  },
  CONFLICT: { status: HttpStatus.CONFLICT, code: API_ERROR_CODES.BAD_REQUEST },
  FORBIDDEN: { status: HttpStatus.FORBIDDEN, code: API_ERROR_CODES.FORBIDDEN },
  MEMBERSHIP_DENIED: {
    status: HttpStatus.FORBIDDEN,
    code: API_ERROR_CODES.MEMBERSHIP_DENIED,
  },
};

@Catch(OrgAccessError)
export class OrgAccessExceptionFilter implements ExceptionFilter<OrgAccessError> {
  private readonly logger = new Logger(OrgAccessExceptionFilter.name);

  catch(error: OrgAccessError, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const requestId =
      typeof request.headers['x-request-id'] === 'string'
        ? request.headers['x-request-id']
        : 'unknown';
    this.logger.warn(
      `[${requestId}] org-access.${error.code} ${request.method} ${request.url}: ${error.message}`,
    );
    const mapping = HTTP_MAPPING[error.code];
    sendApiError(request, response, {
      status: mapping.status,
      code: mapping.code,
      message: error.message,
      details: error instanceof OrgAccessValidationError ? error.details : undefined,
    });
  }
}
