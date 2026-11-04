import { Catch, HttpStatus, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common';
import { API_ERROR_CODES, type ApiErrorCode } from '@techwin/contracts';
import type { Request, Response } from 'express';
import { sendApiError } from '../../../../../common/filters/api-error.response.js';
import {
  OrgCalendarConflictError,
  OrgCalendarNotFoundError,
  OrgCalendarValidationError,
} from '../../../domain/errors/org-calendar.errors.js';

@Catch(OrgCalendarNotFoundError, OrgCalendarConflictError, OrgCalendarValidationError)
export class OrgCalendarExceptionFilter implements ExceptionFilter {
  catch(
    error: OrgCalendarNotFoundError | OrgCalendarConflictError | OrgCalendarValidationError,
    host: ArgumentsHost,
  ): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    let status = HttpStatus.BAD_REQUEST;
    let code: ApiErrorCode = API_ERROR_CODES.BAD_REQUEST;
    if (error instanceof OrgCalendarNotFoundError) {
      status = HttpStatus.NOT_FOUND;
      code = API_ERROR_CODES.NOT_FOUND;
    } else if (error instanceof OrgCalendarConflictError) {
      status = HttpStatus.CONFLICT;
      code = API_ERROR_CODES.BAD_REQUEST;
    } else if (error instanceof OrgCalendarValidationError) {
      status = HttpStatus.FORBIDDEN;
      code = API_ERROR_CODES.FORBIDDEN;
    }
    sendApiError(request, response, { status, code, message: error.message });
  }
}
