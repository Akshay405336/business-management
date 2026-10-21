import { Catch, HttpStatus, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common';
import { API_ERROR_CODES, type ApiErrorCode } from '@techwin/contracts';
import type { Request, Response } from 'express';
import { sendApiError } from '../../../../../common/filters/api-error.response.js';
import { CrmError, type CrmErrorCode } from '../../../domain/errors/crm.errors.js';

const HTTP_MAPPING: Record<CrmErrorCode, { status: number; code: ApiErrorCode }> = {
  NOT_FOUND: { status: HttpStatus.NOT_FOUND, code: API_ERROR_CODES.NOT_FOUND },
  CONFLICT: { status: HttpStatus.CONFLICT, code: API_ERROR_CODES.BAD_REQUEST },
  VALIDATION_FAILED: { status: HttpStatus.BAD_REQUEST, code: API_ERROR_CODES.VALIDATION_FAILED },
  FORBIDDEN: { status: HttpStatus.FORBIDDEN, code: API_ERROR_CODES.FORBIDDEN },
  INVALID_STATUS_TRANSITION: {
    status: HttpStatus.BAD_REQUEST,
    code: API_ERROR_CODES.VALIDATION_FAILED,
  },
  STAGE_DELETE_BLOCKED: { status: HttpStatus.BAD_REQUEST, code: API_ERROR_CODES.BAD_REQUEST },
  PIPELINE_IN_USE: { status: HttpStatus.CONFLICT, code: API_ERROR_CODES.BAD_REQUEST },
};

@Catch(CrmError)
export class CrmExceptionFilter implements ExceptionFilter<CrmError> {
  catch(error: CrmError, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const mapping = HTTP_MAPPING[error.code];
    sendApiError(request, response, {
      status: mapping.status,
      code: mapping.code,
      message: error.message,
    });
  }
}
