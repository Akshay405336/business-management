import { Catch, HttpStatus, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common';
import { API_ERROR_CODES, type ApiErrorCode } from '@techwin/contracts';
import type { Request, Response } from 'express';
import { sendApiError } from '../../../../../common/filters/api-error.response.js';
import { LeaveError } from '../../../domain/errors/leave.errors.js';

@Catch(LeaveError)
export class LeaveExceptionFilter implements ExceptionFilter<LeaveError> {
  catch(error: LeaveError, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    let status = HttpStatus.BAD_REQUEST;
    let code: ApiErrorCode = API_ERROR_CODES.BAD_REQUEST;
    if (error.code === 'LEAVE_NOT_FOUND') {
      status = HttpStatus.NOT_FOUND;
      code = API_ERROR_CODES.NOT_FOUND;
    } else if (error.code === 'LEAVE_FORBIDDEN') {
      status = HttpStatus.FORBIDDEN;
      code = API_ERROR_CODES.FORBIDDEN;
    } else if (error.code === 'LEAVE_CONFLICT') {
      status = HttpStatus.CONFLICT;
      code = API_ERROR_CODES.BAD_REQUEST;
    } else if (error.code === 'LEAVE_VALIDATION') {
      status = HttpStatus.BAD_REQUEST;
      code = API_ERROR_CODES.BAD_REQUEST;
    }
    sendApiError(request, response, { status, code, message: error.message });
  }
}
