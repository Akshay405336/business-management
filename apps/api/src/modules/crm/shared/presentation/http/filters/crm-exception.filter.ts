import { Catch, HttpStatus, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common';
import { API_ERROR_CODES, type ApiErrorCode } from '@techwin/contracts';
import type { Request, Response } from 'express';
import { sendApiError } from '../../../../../../common/filters/api-error.response.js';
import {
  CrmError,
  CrmPipelineHasDependentLeadsError,
  CrmTagInUseError,
  CrmValidationError,
  type CrmErrorCode,
} from '../../../domain/errors/crm.errors.js';
import { CrmDuplicateClientPhoneError } from '../../../domain/errors/crm-client-phone.errors.js';

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
  PIPELINE_HAS_DEPENDENT_LEADS: {
    status: HttpStatus.CONFLICT,
    code: API_ERROR_CODES.PIPELINE_HAS_DEPENDENT_LEADS,
  },
  TAG_IN_USE: {
    status: HttpStatus.CONFLICT,
    code: API_ERROR_CODES.TAG_IN_USE,
  },
};

@Catch(CrmError)
export class CrmExceptionFilter implements ExceptionFilter<CrmError> {
  catch(error: CrmError, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    if (error instanceof CrmDuplicateClientPhoneError) {
      const s = error.summary;
      sendApiError(request, response, {
        status: HttpStatus.CONFLICT,
        code: API_ERROR_CODES.DUPLICATE_CLIENT_PHONE,
        message: error.message,
        details: [
          { path: 'existingClientId', message: s.id },
          { path: 'existingClientName', message: s.name },
          { path: 'existingClientReferenceNumber', message: s.referenceNumber },
          { path: 'existingClientType', message: s.type },
          { path: 'existingClientPhone', message: s.phone ?? '' },
        ],
      });
      return;
    }
    const mapping = HTTP_MAPPING[error.code];
    if (!mapping) {
      sendApiError(request, response, {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        code: API_ERROR_CODES.INTERNAL_ERROR,
        message: error.message,
      });
      return;
    }
    sendApiError(request, response, {
      status: mapping.status,
      code: mapping.code,
      message: error.message,
      details:
        error instanceof CrmValidationError
          ? error.details
          : error instanceof CrmPipelineHasDependentLeadsError
            ? [{ path: 'leadCount', message: String(error.leadCount) }]
            : error instanceof CrmTagInUseError
              ? [{ path: 'leadCount', message: String(error.leadCount) }]
              : undefined,
    });
  }
}
