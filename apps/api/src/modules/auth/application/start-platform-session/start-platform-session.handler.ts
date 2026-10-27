import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  ACCESS_TOKEN_SIGNER,
  OPAQUE_TOKEN_SERVICE,
  type AccessTokenSigner,
  type OpaqueTokenService,
} from '../../../../infrastructure/security/security.contracts.js';
import type { PlatformAdmin } from '../../domain/entities/platform-admin.entity.js';
import { PlatformSession } from '../../domain/entities/platform-session.entity.js';
import {
  PLATFORM_AUTH_REPOSITORY,
  type PlatformAuthRepository,
} from '../../domain/repositories/platform-auth.repository.js';
import { PlatformSessionPolicy } from '../../domain/services/platform-session-policy.js';
import { PlatformSessionId } from '../../domain/value-objects/platform-session-id.js';
import type { IssuedPlatformSession } from '../verify-totp/verify-totp.result.js';

export type StartPlatformSessionCommand = {
  readonly admin: PlatformAdmin;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
  readonly now: Date;
};

@Injectable()
export class StartPlatformSessionHandler {
  constructor(
    @Inject(PLATFORM_AUTH_REPOSITORY) private readonly repository: PlatformAuthRepository,
    @Inject(OPAQUE_TOKEN_SERVICE) private readonly tokens: OpaqueTokenService,
    @Inject(ACCESS_TOKEN_SIGNER) private readonly accessTokens: AccessTokenSigner,
  ) {}

  async execute(command: StartPlatformSessionCommand): Promise<IssuedPlatformSession> {
    const { admin, now } = command;
    const refreshToken = this.tokens.generate();
    const csrfToken = this.tokens.generate();
    const refreshTokenExpiresAt = PlatformSessionPolicy.refreshTokenExpiry(now);
    const accessTokenExpiresAt = PlatformSessionPolicy.accessTokenExpiry(now);

    const session = PlatformSession.start({
      id: PlatformSessionId.generate(),
      adminId: admin.id,
      csrfTokenHash: this.tokens.hash(csrfToken),
      ipAddress: command.ipAddress,
      userAgent: command.userAgent,
      now,
      expiresAt: refreshTokenExpiresAt,
    });
    await this.repository.createSession(session, {
      id: randomUUID(),
      tokenHash: this.tokens.hash(refreshToken),
      expiresAt: refreshTokenExpiresAt,
    });

    const accessToken = await this.accessTokens.sign(
      { subject: admin.id, sessionId: session.id.value, role: admin.role },
      accessTokenExpiresAt,
    );

    return {
      sessionId: session.id.value,
      sessionExpiresAt: session.expiresAt,
      accessToken,
      accessTokenExpiresAt,
      refreshToken,
      refreshTokenExpiresAt,
      csrfToken,
    };
  }
}
