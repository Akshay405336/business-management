import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export interface ClientContext {
  /** Client IP as resolved by Express using the configured `trust proxy` setting. */
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
}

const MAX_USER_AGENT_LENGTH = 512;

export const resolveClientContext = (request: Request): ClientContext => ({
  ipAddress: request.ip ? request.ip.slice(0, 64) : null,
  userAgent: request.get('user-agent')?.slice(0, MAX_USER_AGENT_LENGTH) ?? null,
});

/** Injects the caller's IP address and user agent into a route handler. */
export const Client = createParamDecorator((_data: unknown, context: ExecutionContext) =>
  resolveClientContext(context.switchToHttp().getRequest<Request>()),
);
