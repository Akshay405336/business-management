import { HttpException } from '@nestjs/common';
import type { ApiErrorCode, ApiErrorDetail, ApiErrorResponse } from '@techwin/contracts';
import type { Request, Response } from 'express';

/** HTTP exception that carries a stable, machine-readable error code. */
export class ApiException extends HttpException {
  constructor(
    status: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly details?: readonly ApiErrorDetail[],
    readonly retryAfterSeconds?: number,
  ) {
    super(message, status);
  }
}

export function requestIdOf(request: Request): string | null {
  const id = (request as Request & { id?: unknown }).id;
  return typeof id === 'string' ? id : null;
}

/** Writes the single error envelope used by every API error response. */
export function sendApiError(
  request: Request,
  response: Response,
  input: {
    status: number;
    code: ApiErrorCode;
    message: string;
    details?: readonly ApiErrorDetail[] | undefined;
    retryAfterSeconds?: number | undefined;
  },
): void {
  if (response.headersSent) return;
  if (input.retryAfterSeconds !== undefined) {
    response.setHeader('Retry-After', String(input.retryAfterSeconds));
  }
  const body: ApiErrorResponse = {
    statusCode: input.status,
    error: {
      code: input.code,
      message: input.message,
      requestId: requestIdOf(request),
      ...(input.details && input.details.length > 0 ? { details: input.details } : {}),
      ...(input.retryAfterSeconds !== undefined
        ? { retryAfterSeconds: input.retryAfterSeconds }
        : {}),
    },
  };
  response.status(input.status).json(body);
}
