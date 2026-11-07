import { Catch, HttpStatus, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common';
import { API_ERROR_CODES, type ApiErrorCode, type ApiErrorDetail } from '@techwin/contracts';
import type { Request, Response } from 'express';
import { sendApiError } from '../../../../../common/filters/api-error.response.js';
import {
  LeaveBalanceHasDependenciesError,
  LeaveError,
  LeaveTypeHasDependenciesError,
} from '../../../domain/errors/leave.errors.js';

@Catch(LeaveError)
export class LeaveExceptionFilter implements ExceptionFilter<LeaveError> {
  catch(error: LeaveError, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    let status = HttpStatus.BAD_REQUEST;
    let code: ApiErrorCode = API_ERROR_CODES.BAD_REQUEST;
    let details: readonly ApiErrorDetail[] | undefined;
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
    } else if (error instanceof LeaveTypeHasDependenciesError) {
      status = HttpStatus.CONFLICT;
      code = API_ERROR_CODES.LEAVE_TYPE_HAS_DEPENDENCIES;
      details = [
        { path: 'requestCount', message: String(error.requestCount) },
        { path: 'balanceCount', message: String(error.balanceCount) },
        { path: 'allocationCount', message: String(error.allocationCount) },
      ];
    } else if (error instanceof LeaveBalanceHasDependenciesError) {
      status = HttpStatus.CONFLICT;
      code = API_ERROR_CODES.LEAVE_BALANCE_HAS_DEPENDENCIES;
      details = [
        { path: 'pendingRequestCount', message: String(error.pendingRequestCount) },
        { path: 'approvedRequestCount', message: String(error.approvedRequestCount) },
        { path: 'consumedBalanceCount', message: String(error.consumedBalanceCount) },
        { path: 'adjustedBalanceCount', message: String(error.adjustedBalanceCount) },
        { path: 'protectedTransactionCount', message: String(error.protectedTransactionCount) },
      ];
    }
    sendApiError(request, response, { status, code, message: error.message, details });
  }
}
