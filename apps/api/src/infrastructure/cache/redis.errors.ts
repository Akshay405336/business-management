/** Redis command or connectivity failure (not an application rate-limit decision). */
export class RedisInfrastructureError extends Error {
  readonly code: string | undefined;

  constructor(message: string, options?: { cause?: unknown; code?: string }) {
    super(message, options);
    this.name = 'RedisInfrastructureError';
    this.code = options?.code;
  }
}

export function isRedisInfrastructureError(error: unknown): error is RedisInfrastructureError {
  return error instanceof RedisInfrastructureError;
}

export function wrapRedisCommandError(error: unknown): RedisInfrastructureError {
  if (error instanceof RedisInfrastructureError) return error;
  const base = error instanceof Error ? error : new Error(String(error));
  let code: string | undefined;
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const maybe = Reflect.get(error, 'code');
    if (typeof maybe === 'string') code = maybe;
  }
  return new RedisInfrastructureError(base.message, { cause: error, code });
}
