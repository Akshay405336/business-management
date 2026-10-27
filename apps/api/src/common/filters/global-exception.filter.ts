import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import { API_ERROR_CODES, type ApiErrorCode } from '@techwin/contracts';
import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import { ApiException, sendApiError } from './api-error.response.js';

const CODE_BY_STATUS: Partial<Record<number, ApiErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: API_ERROR_CODES.BAD_REQUEST,
  [HttpStatus.UNAUTHORIZED]: API_ERROR_CODES.UNAUTHENTICATED,
  [HttpStatus.FORBIDDEN]: API_ERROR_CODES.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: API_ERROR_CODES.NOT_FOUND,
  [HttpStatus.PAYLOAD_TOO_LARGE]: API_ERROR_CODES.PAYLOAD_TOO_LARGE,
  [HttpStatus.TOO_MANY_REQUESTS]: API_ERROR_CODES.RATE_LIMITED,
  [HttpStatus.SERVICE_UNAVAILABLE]: API_ERROR_CODES.SERVICE_UNAVAILABLE,
};

/** Errors raised by Express body parsing before Nest routing takes over. */
interface BodyParserError {
  readonly type: string;
  readonly status: number;
}

const isBodyParserError = (value: unknown): value is BodyParserError =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as BodyParserError).type === 'string' &&
  typeof (value as BodyParserError).status === 'number';

/** Prisma connection / auth failures (P1000–P1017) — not application logic errors. */
const PRISMA_UNAVAILABLE_CODES = new Set([
  'P1000',
  'P1001',
  'P1002',
  'P1003',
  'P1008',
  'P1010',
  'P1011',
  'P1017',
]);

function isPrismaUnavailable(error: unknown): error is Error & { code: string } {
  if (!(error instanceof Error) || error.name !== 'PrismaClientKnownRequestError') return false;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' && PRISMA_UNAVAILABLE_CODES.has(code);
}

function prismaKnownRequestCode(error: unknown): string | null {
  if (!(error instanceof Error) || error.name !== 'PrismaClientKnownRequestError') return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : null;
}

function requestCorrelationId(request: Request): string {
  const header = request.headers['x-request-id'];
  return typeof header === 'string' && header.trim() ? header.trim() : 'unknown';
}

/**
 * Last line of defence: converts every exception into the standard error
 * envelope. Server errors are logged with their stack but returned to the
 * client as a generic message so internals never leak.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    if (exception instanceof ApiException) {
      if (exception.details?.length) {
        this.logger.warn(
          `Request validation failed: ${request.method} ${request.url} ${exception.details
            .map((detail) => `${detail.path || '(root)'}=${detail.message}`)
            .join('; ')}`,
        );
      }
      sendApiError(request, response, {
        status: exception.getStatus(),
        code: exception.code,
        message: exception.message,
        details: exception.details,
        retryAfterSeconds: exception.retryAfterSeconds,
      });
      return;
    }

    if (exception instanceof ZodError) {
      const details = exception.issues.map((issue) => {
        if (
          issue.code === 'unrecognized_keys' &&
          'keys' in issue &&
          Array.isArray(issue.keys) &&
          issue.keys.length > 0
        ) {
          return {
            path: String(issue.keys[0]),
            message: issue.message,
          };
        }
        return {
          path: issue.path.map(String).join('.'),
          message: issue.message,
        };
      });
      this.logger.warn(
        `Request validation failed: ${request.method} ${request.url} ${details
          .map((detail) => `${detail.path || '(root)'}=${detail.message}`)
          .join('; ')}`,
      );
      sendApiError(request, response, {
        status: HttpStatus.BAD_REQUEST,
        code: API_ERROR_CODES.VALIDATION_FAILED,
        message: 'The request is invalid.',
        details,
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      if (status >= 500) this.logger.error(exception.message, exception.stack);
      sendApiError(request, response, {
        status,
        code:
          CODE_BY_STATUS[status] ??
          (status >= 500 ? API_ERROR_CODES.INTERNAL_ERROR : API_ERROR_CODES.BAD_REQUEST),
        message:
          status >= 500 && status !== 503 ? 'An unexpected error occurred.' : exception.message,
      });
      return;
    }

    if (isBodyParserError(exception) && exception.status < 500) {
      sendApiError(request, response, {
        status: exception.status,
        code:
          exception.status === 413
            ? API_ERROR_CODES.PAYLOAD_TOO_LARGE
            : API_ERROR_CODES.BAD_REQUEST,
        message:
          exception.status === 413 ? 'Request body is too large.' : 'Malformed request body.',
      });
      return;
    }

    if (isPrismaUnavailable(exception)) {
      this.logger.error(`Database unavailable (${exception.code})`);
      sendApiError(request, response, {
        status: HttpStatus.SERVICE_UNAVAILABLE,
        code: API_ERROR_CODES.SERVICE_UNAVAILABLE,
        message: 'The service is temporarily unavailable. Please try again shortly.',
      });
      return;
    }

    const error = exception instanceof Error ? exception : new Error(String(exception));
    const prismaCode = prismaKnownRequestCode(exception);
    const correlationId = requestCorrelationId(request);
    if (prismaCode === 'P2022') {
      this.logger.error(
        `[${correlationId}] Database schema mismatch (${prismaCode}) on ${request.method} ${request.url}: ${error.message}. Apply pending migrations (pnpm db:migrate:deploy).`,
      );
    } else {
      this.logger.error(
        `[${correlationId}] Unhandled ${error.name} on ${request.method} ${request.url}: ${error.message}`,
        error.stack,
      );
    }
    sendApiError(request, response, {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: API_ERROR_CODES.INTERNAL_ERROR,
      message: 'An unexpected error occurred.',
    });
  }
}
