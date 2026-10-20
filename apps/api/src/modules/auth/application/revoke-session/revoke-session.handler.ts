import { Inject, Injectable } from '@nestjs/common';
import { SessionNotFoundError } from '../../domain/errors/platform-auth.errors.js';
import {
  PLATFORM_AUTH_REPOSITORY,
  type PlatformAuthRepository,
} from '../../domain/repositories/platform-auth.repository.js';
import { PlatformSessionId } from '../../domain/value-objects/platform-session-id.js';
import type { RevokeSessionCommand } from './revoke-session.command.js';
import type { RevokeSessionResult } from './revoke-session.result.js';

@Injectable()
export class RevokeSessionHandler {
  constructor(
    @Inject(PLATFORM_AUTH_REPOSITORY) private readonly repository: PlatformAuthRepository,
  ) {}

  async execute(command: RevokeSessionCommand): Promise<RevokeSessionResult> {
    const sessionId = PlatformSessionId.parse(command.sessionId);
    const now = new Date();

    const session = await this.repository.findSessionById(sessionId);
    // Sessions of other administrators are reported as missing, not forbidden.
    if (!session || !session.belongsTo(command.adminId) || !session.isActive(now)) {
      throw new SessionNotFoundError();
    }

    await this.repository.revokeSession(sessionId, 'REVOKED', now);
    await this.repository.recordAuditEvent({
      type: 'SESSION_REVOKED',
      adminId: command.adminId,
      ipAddress: command.ipAddress,
      userAgent: command.userAgent,
      metadata: { sessionId: sessionId.value },
    });

    return {
      sessionId: sessionId.value,
      wasCurrentSession: sessionId.value === command.currentSessionId,
    };
  }
}
