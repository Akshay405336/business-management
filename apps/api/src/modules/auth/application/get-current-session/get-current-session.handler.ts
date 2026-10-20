import { Inject, Injectable } from '@nestjs/common';
import { SessionExpiredError } from '../../domain/errors/platform-auth.errors.js';
import {
  PLATFORM_AUTH_REPOSITORY,
  type PlatformAuthRepository,
} from '../../domain/repositories/platform-auth.repository.js';
import { PlatformSessionId } from '../../domain/value-objects/platform-session-id.js';
import type { GetCurrentSessionQuery } from './get-current-session.query.js';
import {
  toPlatformAdminView,
  toPlatformSessionView,
  type GetCurrentSessionResult,
} from './get-current-session.result.js';

/**
 * Resolves the live session behind an access token. Access tokens are short
 * lived, but this check makes revocation (logout, logout-all) take effect
 * immediately instead of when the token expires.
 */
@Injectable()
export class GetCurrentSessionHandler {
  constructor(
    @Inject(PLATFORM_AUTH_REPOSITORY) private readonly repository: PlatformAuthRepository,
  ) {}

  async execute(query: GetCurrentSessionQuery): Promise<GetCurrentSessionResult> {
    const now = new Date();
    let sessionId: PlatformSessionId;
    try {
      sessionId = PlatformSessionId.parse(query.sessionId);
    } catch {
      throw new SessionExpiredError();
    }

    const session = await this.repository.findSessionById(sessionId);
    if (!session || !session.belongsTo(query.adminId) || !session.isActive(now)) {
      throw new SessionExpiredError();
    }

    const admin = await this.repository.findAdminById(query.adminId);
    if (!admin) throw new SessionExpiredError();
    admin.ensureCanAuthenticate();

    return {
      admin: toPlatformAdminView(admin),
      session: toPlatformSessionView(session, sessionId.value),
    };
  }
}
