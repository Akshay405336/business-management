import { Inject, Injectable } from '@nestjs/common';
import {
  OPAQUE_TOKEN_SERVICE,
  type OpaqueTokenService,
} from '../../../../infrastructure/security/security.contracts.js';
import type { PlatformSession } from '../../domain/entities/platform-session.entity.js';
import { CsrfTokenMismatchError } from '../../domain/errors/platform-auth.errors.js';
import {
  PLATFORM_AUTH_REPOSITORY,
  type PlatformAuthRepository,
} from '../../domain/repositories/platform-auth.repository.js';
import { PlatformSessionId } from '../../domain/value-objects/platform-session-id.js';
import type { LogoutCommand } from './logout.command.js';
import type { LogoutResult } from './logout.result.js';

@Injectable()
export class LogoutHandler {
  constructor(
    @Inject(PLATFORM_AUTH_REPOSITORY) private readonly repository: PlatformAuthRepository,
    @Inject(OPAQUE_TOKEN_SERVICE) private readonly tokens: OpaqueTokenService,
  ) {}

  async execute(command: LogoutCommand): Promise<LogoutResult> {
    const now = new Date();
    const session = await this.resolveSession(command);
    if (!session || !session.isActive(now)) return { revoked: false };

    const revoked = await this.repository.revokeSession(session.id, 'LOGOUT', now);
    if (revoked) {
      await this.repository.recordAuditEvent({
        type: 'LOGOUT',
        adminId: session.adminId,
        ipAddress: command.ipAddress,
        userAgent: command.userAgent,
        metadata: { sessionId: session.id.value },
      });
    }
    return { revoked };
  }

  private async resolveSession(command: LogoutCommand): Promise<PlatformSession | null> {
    if (command.refreshToken) {
      const found = await this.repository.findRefreshTokenByHash(
        this.tokens.hash(command.refreshToken),
      );
      if (found) {
        if (
          !command.csrfToken ||
          !this.tokens.matches(command.csrfToken, found.session.csrfTokenHash)
        ) {
          throw new CsrfTokenMismatchError();
        }
        return found.session;
      }
    }

    if (command.accessTokenSessionId && command.accessTokenAdminId) {
      let sessionId: PlatformSessionId;
      try {
        sessionId = PlatformSessionId.parse(command.accessTokenSessionId);
      } catch {
        return null;
      }
      const session = await this.repository.findSessionById(sessionId);
      return session?.belongsTo(command.accessTokenAdminId) ? session : null;
    }
    return null;
  }
}
