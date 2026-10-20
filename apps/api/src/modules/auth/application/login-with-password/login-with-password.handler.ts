import { Inject, Injectable } from '@nestjs/common';
import {
  OPAQUE_TOKEN_SERVICE,
  PASSWORD_HASHER,
  RATE_LIMITER,
  type OpaqueTokenService,
  type PasswordHasher,
  type RateLimitPolicy,
  type RateLimiter,
} from '../../../../infrastructure/security/security.contracts.js';
import { PlatformAuthChallenge } from '../../domain/entities/platform-auth-challenge.entity.js';
import {
  AuthAttemptsThrottledError,
  InvalidCredentialsError,
  PlatformAuthError,
} from '../../domain/errors/platform-auth.errors.js';
import {
  PLATFORM_AUTH_REPOSITORY,
  type PlatformAuthRepository,
} from '../../domain/repositories/platform-auth.repository.js';
import { PlatformSessionPolicy } from '../../domain/services/platform-session-policy.js';
import { PlatformEmail } from '../../domain/value-objects/platform-email.js';
import type { LoginWithPasswordCommand } from './login-with-password.command.js';
import type { LoginWithPasswordResult } from './login-with-password.result.js';

export const LOGIN_BY_IP_POLICY: RateLimitPolicy = {
  name: 'login-ip',
  limit: 20,
  windowSeconds: 15 * 60,
};
export const LOGIN_BY_ACCOUNT_POLICY: RateLimitPolicy = {
  name: 'login-account',
  limit: 10,
  windowSeconds: 15 * 60,
};

@Injectable()
export class LoginWithPasswordHandler {
  constructor(
    @Inject(PLATFORM_AUTH_REPOSITORY) private readonly repository: PlatformAuthRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(OPAQUE_TOKEN_SERVICE) private readonly tokens: OpaqueTokenService,
    @Inject(RATE_LIMITER) private readonly rateLimiter: RateLimiter,
  ) {}

  async execute(command: LoginWithPasswordCommand): Promise<LoginWithPasswordResult> {
    const email = this.parseEmail(command.email);
    await this.throttle(command.ipAddress, email);

    const admin = await this.repository.findAdminByEmail(email);
    if (!admin) {
      await this.passwordHasher.verifyAgainstDummy(command.password);
      await this.recordFailure(null, command, 'unknown_account');
      throw new InvalidCredentialsError();
    }

    const passwordMatches = await this.passwordHasher.verify(admin.passwordHash, command.password);
    if (!passwordMatches) {
      await this.recordFailure(admin.id, command, 'wrong_password');
      throw new InvalidCredentialsError();
    }

    admin.ensureCanAuthenticate();

    if (this.passwordHasher.needsRehash(admin.passwordHash)) {
      await this.repository.updatePasswordHash(
        admin.id,
        await this.passwordHasher.hash(command.password),
      );
    }

    const now = new Date();
    await this.repository.deleteStaleChallenges(admin.id, now);

    const challengeToken = this.tokens.generate();
    const challenge = PlatformAuthChallenge.issue({
      adminId: admin.id,
      tokenHash: this.tokens.hash(challengeToken),
      expiresAt: PlatformSessionPolicy.challengeExpiry(now),
      ipAddress: command.ipAddress,
      userAgent: command.userAgent,
      now,
    });
    await this.repository.createChallenge(challenge);
    await this.rateLimiter.reset(LOGIN_BY_ACCOUNT_POLICY, email.value);
    await this.repository.recordAuditEvent({
      type: 'PASSWORD_VERIFIED',
      adminId: admin.id,
      ipAddress: command.ipAddress,
      userAgent: command.userAgent,
    });

    return {
      challengeToken,
      challengeExpiresAt: challenge.expiresAt,
      enrollmentPending: !admin.isTotpEnrolled,
    };
  }

  private parseEmail(raw: string): PlatformEmail {
    try {
      return PlatformEmail.create(raw);
    } catch (error) {
      if (error instanceof PlatformAuthError) throw new InvalidCredentialsError();
      throw error;
    }
  }

  private async throttle(ipAddress: string | null, email: PlatformEmail): Promise<void> {
    const decisions = await Promise.all([
      this.rateLimiter.consume(LOGIN_BY_IP_POLICY, ipAddress ?? 'unknown'),
      this.rateLimiter.consume(LOGIN_BY_ACCOUNT_POLICY, email.value),
    ]);
    const blocked = decisions.filter((decision) => !decision.allowed);
    if (blocked.length > 0) {
      throw new AuthAttemptsThrottledError(
        Math.max(...blocked.map((decision) => decision.retryAfterSeconds)),
      );
    }
  }

  private recordFailure(
    adminId: string | null,
    command: LoginWithPasswordCommand,
    reason: string,
  ): Promise<void> {
    return this.repository.recordAuditEvent({
      type: 'PASSWORD_LOGIN_FAILED',
      adminId,
      ipAddress: command.ipAddress,
      userAgent: command.userAgent,
      metadata: { reason },
    });
  }
}
