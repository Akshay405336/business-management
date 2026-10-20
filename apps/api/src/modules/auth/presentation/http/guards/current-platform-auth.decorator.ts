import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { PlatformAuthContext, PlatformAuthenticatedRequest } from './platform-admin.guard.js';

/** Resolves the context attached by `PlatformAdminGuard`. */
export const CurrentPlatformAuth = createParamDecorator(
  (_data: unknown, context: ExecutionContext): PlatformAuthContext => {
    const auth = context.switchToHttp().getRequest<PlatformAuthenticatedRequest>().platformAuth;
    if (!auth) throw new Error('CurrentPlatformAuth used on a route without PlatformAdminGuard.');
    return auth;
  },
);
