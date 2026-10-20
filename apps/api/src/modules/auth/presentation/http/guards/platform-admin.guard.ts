import {
  HttpStatus,
  Inject,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { API_ERROR_CODES } from '@techwin/contracts';
import type { Request } from 'express';
import { ApiException } from '../../../../../common/filters/api-error.response.js';
import {
  ACCESS_TOKEN_VERIFIER,
  type AccessTokenVerifier,
} from '../../../../../infrastructure/security/security.contracts.js';
import { GetCurrentSessionHandler } from '../../../application/get-current-session/get-current-session.handler.js';
import type { GetCurrentSessionResult } from '../../../application/get-current-session/get-current-session.result.js';

export interface PlatformAuthContext extends GetCurrentSessionResult {
  readonly adminId: string;
  readonly sessionId: string;
}

export type PlatformAuthenticatedRequest = Request & { platformAuth?: PlatformAuthContext };

export function extractBearerToken(request: Request): string | null {
  const header = request.get('authorization');
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token.trim() : null;
}

/**
 * Authenticates platform administrators by access token and confirms that the
 * session behind it is still live (not revoked or expired).
 */
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(
    @Inject(ACCESS_TOKEN_VERIFIER) private readonly accessTokens: AccessTokenVerifier,
    @Inject(GetCurrentSessionHandler) private readonly currentSession: GetCurrentSessionHandler,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<PlatformAuthenticatedRequest>();
    const token = extractBearerToken(request);
    if (!token) {
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        API_ERROR_CODES.UNAUTHENTICATED,
        'Authentication is required.',
      );
    }

    const claims = await this.accessTokens.verify(token);
    if (!claims) {
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        API_ERROR_CODES.ACCESS_TOKEN_INVALID,
        'The access token is invalid or has expired.',
      );
    }
    if (claims.role !== 'SUPER_ADMIN') {
      throw new ApiException(HttpStatus.FORBIDDEN, API_ERROR_CODES.FORBIDDEN, 'Access denied.');
    }

    const result = await this.currentSession.execute({
      adminId: claims.subject,
      sessionId: claims.sessionId,
    });
    request.platformAuth = { ...result, adminId: claims.subject, sessionId: claims.sessionId };
    return true;
  }
}
