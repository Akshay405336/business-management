import type { ApiErrorCode, ApiErrorDetail, ApiErrorResponse } from '@techwin/contracts';

export type ApiErrorKind = 'http' | 'network' | 'timeout';

export class ApiError extends Error {
  constructor(
    readonly kind: ApiErrorKind,
    message: string,
    readonly status: number | null = null,
    readonly code: ApiErrorCode | null = null,
    readonly details: readonly ApiErrorDetail[] = [],
    readonly requestId: string | null = null,
    readonly retryAfterSeconds: number | null = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static async fromResponse(response: Response): Promise<ApiError> {
    let body: Partial<ApiErrorResponse> | null = null;
    try {
      body = (await response.json()) as Partial<ApiErrorResponse>;
    } catch {
      body = null;
    }
    const error = body?.error;
    const retryHeader = Number(response.headers.get('retry-after'));
    return new ApiError(
      'http',
      error?.message ?? `Request failed with status ${response.status}.`,
      response.status,
      error?.code ?? null,
      error?.details ?? [],
      error?.requestId ?? response.headers.get('x-request-id'),
      error?.retryAfterSeconds ??
        (Number.isFinite(retryHeader) && retryHeader > 0 ? retryHeader : null),
    );
  }

  /** True when the failure says nothing about the session (offline, timeout, 5xx). */
  get isTransient(): boolean {
    return this.kind !== 'http' || (this.status !== null && this.status >= 500);
  }
}

export const isApiError = (value: unknown): value is ApiError => value instanceof ApiError;
