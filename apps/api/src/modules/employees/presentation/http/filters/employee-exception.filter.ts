import { Catch, HttpStatus, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common';
import { API_ERROR_CODES, type ApiErrorCode } from '@techwin/contracts';
import type { Request, Response } from 'express';
import { sendApiError } from '../../../../../common/filters/api-error.response.js';
import {
  EmployeeError,
  EmployeeValidationError,
  type EmployeeErrorCode,
} from '../../../domain/errors/employee.errors.js';

const HTTP_MAPPING: Record<EmployeeErrorCode, { status: number; code: ApiErrorCode }> = {
  NOT_FOUND: { status: HttpStatus.NOT_FOUND, code: API_ERROR_CODES.NOT_FOUND },
  VALIDATION_FAILED: {
    status: HttpStatus.BAD_REQUEST,
    code: API_ERROR_CODES.VALIDATION_FAILED,
  },
  CONFLICT: { status: HttpStatus.CONFLICT, code: API_ERROR_CODES.BAD_REQUEST },
};

@Catch(EmployeeError)
export class EmployeeExceptionFilter implements ExceptionFilter<EmployeeError> {
  catch(error: EmployeeError, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const mapping = HTTP_MAPPING[error.code];
    sendApiError(request, response, {
      status: mapping.status,
      code: mapping.code,
      message: error.message,
      details: error instanceof EmployeeValidationError ? error.details : undefined,
    });
  }
}
