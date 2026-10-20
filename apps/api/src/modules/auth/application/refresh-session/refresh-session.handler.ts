import { Inject, Injectable } from '@nestjs/common';
import {
  ACCESS_TOKEN_SIGNER,
  OPAQUE_TOKEN_SERVICE,
  RATE_LIMITER,
  type AccessTokenSigner,
  type OpaqueTokenService,
  type RateLimitPolicy,
  type RateLimiter,
} from '../../../../infrastructure/security/security.contracts.js';
import type { PlatformSession } from '../../domain/entities/platform-session.entity.js';
import {
  AuthAttemptsThrottledError,
  CsrfTokenMismatchError,
  SessionExpiredError,
} from '../../domain/errors/platform-auth.errors.js';
import {
  PLATFORM_AUTH_REPOSITORY,
  type PlatformAuthRepository,
} from '../../domain/repositories/platform-auth.repository.js';
import { PlatformSessionPolicy } from '../../domain/services/platform-session-policy.js';
import type { RefreshSessionCommand } from './refresh-session.command.js';
import type { RefreshSessionResult } from './refresh-session.result.js';

export const REFRESH_BY_IP_POLICY: RateLimitPolicy = {
  name: 'refresh-ip',
  limit: 120,
  windowSeconds: 15 * 60,
};

/**
 * Rotates the refresh token on every use. Presenting a token that was already
 * rotated means it was copied, so the whole session is revoked.
 */
@Injectable()
export class RefreshSessionHandler {
  constructor(
    @Inject(PLATFORM_AUTH_REPOSITORY) private readonly repository: PlatformAuthRepository,
    @Inject(OPAQUE_TOKEN_SERVICE) private readonly tokens: OpaqueTokenService,
    @Inject(ACCESS_TOKEN_SIGNER) private readonly accessTokens: AccessTokenSigner,
    @Inject(RATE_LIMITER) private readonly rateLimiter: RateLimiter,
  ) {}

  async execute(command: RefreshSessionCommand): Promise<RefreshSessionResult> {
    if (!command.refreshToken) throw new SessionExpiredError();

    const decision = await this.rateLimiter.consume(
      REFRESH_BY_IP_POLICY,
      command.ipAddress ?? 'unknown',
    );
    if (!decision.allowed) throw new AuthAttemptsThrottledError(decision.retryAfterSeconds);

    const now = new Date();
    const found = await this.repository.findRefreshTokenByHash(
      this.tokens.hash(command.refreshToken),
    );
    if (!found) throw new SessionExpiredError();
    const { token, session } = found;

    // Verify CSRF before reuse detection, so a forged cross-site request can
    // neither refresh nor trigger a revocation.
    if (!command.csrfToken || !this.tokens.matches(command.csrfToken, session.csrfTokenHash)) {
      throw new CsrfTokenMismatchError();
    }

    if (token.rotatedAt !== null) {
      await this.revokeForReuse(session, command, now);
      throw new SessionExpiredError();
    }
    if (token.expiresAt.getTime() <= now.getTime()) throw new SessionExpiredError();
    session.ensureActive(now);

    const admin = await this.repository.findAdminById(session.adminId);
    if (!admin) throw new SessionExpiredError();
    admin.ensureCanAuthenticate();

    const refreshToken = this.tokens.generate();
    const csrfToken = this.tokens.generate();
    const refreshTokenExpiresAt = PlatformSessionPolicy.refreshTokenExpiry(now);

    const rotated = await this.repository.rotateRefreshToken({
      sessionId: session.id,
      currentTokenId: token.id,
      next: {
        id: crypto.randomUUID(),
        tokenHash: this.tokens.hash(refreshToken),
        expiresAt: refreshTokenExpiresAt,
      },
      nextCsrfTokenHash: this.tokens.hash(csrfToken),
      now,
    });
    if (!rotated) {
      await this.revokeForReuse(session, command, now);
      throw new SessionExpiredError();
    }

    const accessTokenExpiresAt = PlatformSessionPolicy.accessTokenExpiry(now);
    const accessToken = await this.accessTokens.sign(
      { subject: admin.id, sessionId: session.id.value, role: admin.role },
      accessTokenExpiresAt,
    );

    return {
      sessionId: session.id.value,
      sessionExpiresAt: refreshTokenExpiresAt,
      accessToken,
      accessTokenExpiresAt,
      refreshToken,
      refreshTokenExpiresAt,
      csrfToken,
    };
  }

  private async revokeForReuse(
    session: PlatformSession,
    command: RefreshSessionCommand,
    now: Date,
  ): Promise<void> {
    await this.repository.revokeSession(session.id, 'REFRESH_TOKEN_REUSE', now);
    await this.repository.recordAuditEvent({
      type: 'REFRESH_TOKEN_REUSE_DETECTED',
      adminId: session.adminId,
      ipAddress: command.ipAddress,
      userAgent: command.userAgent,
      metadata: { sessionId: session.id.value },
    });
  }
}
