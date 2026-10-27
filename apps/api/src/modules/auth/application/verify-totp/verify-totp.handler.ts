import { Inject, Injectable } from '@nestjs/common';
import {
  OPAQUE_TOKEN_SERVICE,
  RATE_LIMITER,
  TOTP_CODE_VERIFIER,
  type OpaqueTokenService,
  type RateLimitPolicy,
  type RateLimiter,
  type TotpCodeVerifier,
} from '../../../../infrastructure/security/security.contracts.js';
import type { PlatformAdmin } from '../../domain/entities/platform-admin.entity.js';
import type { PlatformAuthChallenge } from '../../domain/entities/platform-auth-challenge.entity.js';
import {
  AuthAttemptsThrottledError,
  AuthChallengeExpiredError,
  InvalidTotpCodeError,
} from '../../domain/errors/platform-auth.errors.js';
import {
  PLATFORM_AUTH_REPOSITORY,
  type PlatformAuthRepository,
} from '../../domain/repositories/platform-auth.repository.js';
import { PlatformSessionPolicy } from '../../domain/services/platform-session-policy.js';
import { requiresTotpForLogin } from '../../domain/services/platform-totp-policy.js';
import {
  PLATFORM_TOTP_SECRET_PROTECTOR,
  type PlatformTotpSecretProtector,
} from '../../domain/services/platform-totp-secret-protector.js';
import { toPlatformAdminView } from '../get-current-session/get-current-session.result.js';
import { StartPlatformSessionHandler } from '../start-platform-session/start-platform-session.handler.js';
import type { VerifyTotpCommand } from './verify-totp.command.js';
import type { VerifyTotpResult } from './verify-totp.result.js';

export const TOTP_BY_IP_POLICY: RateLimitPolicy = {
  name: 'totp-ip',
  limit: 30,
  windowSeconds: 15 * 60,
};

@Injectable()
export class VerifyTotpHandler {
  constructor(
    @Inject(PLATFORM_AUTH_REPOSITORY) private readonly repository: PlatformAuthRepository,
    @Inject(TOTP_CODE_VERIFIER) private readonly totpVerifier: TotpCodeVerifier,
    @Inject(PLATFORM_TOTP_SECRET_PROTECTOR)
    private readonly secretProtector: PlatformTotpSecretProtector,
    @Inject(OPAQUE_TOKEN_SERVICE) private readonly tokens: OpaqueTokenService,
    @Inject(RATE_LIMITER) private readonly rateLimiter: RateLimiter,
    @Inject(StartPlatformSessionHandler)
    private readonly startSession: StartPlatformSessionHandler,
  ) {}

  async execute(command: VerifyTotpCommand): Promise<VerifyTotpResult> {
    if (!command.challengeToken) throw new AuthChallengeExpiredError();

    const decision = await this.rateLimiter.consume(
      TOTP_BY_IP_POLICY,
      command.ipAddress ?? 'unknown',
    );
    if (!decision.allowed) throw new AuthAttemptsThrottledError(decision.retryAfterSeconds);

    const now = new Date();
    const challenge = await this.repository.findChallengeByTokenHash(
      this.tokens.hash(command.challengeToken),
    );
    if (!challenge || !challenge.isUsable(now)) throw new AuthChallengeExpiredError();

    const admin = await this.repository.findAdminById(challenge.adminId);
    if (!admin) throw new AuthChallengeExpiredError();
    admin.ensureCanAuthenticate();
    if (!requiresTotpForLogin(admin)) {
      await this.repository.consumeChallenge(challenge.id, now);
      throw new AuthChallengeExpiredError();
    }

    const { secret, requiresReprotection } = this.secretProtector.reveal(
      admin.id,
      admin.totpSecretCiphertext,
    );
    const verification = await this.totpVerifier.verify({
      secret: secret.reveal(),
      code: command.code,
      afterTimeStep: admin.lastTotpTimeStep,
    });

    if (!verification.valid) return this.rejectCode(challenge, admin, command, now);

    // Claim the time step before consuming the challenge so that a replayed
    // code can never complete a second sign-in.
    const claimed = await this.repository.claimTotpTimeStep(admin.id, verification.timeStep, now);
    if (!claimed) return this.rejectCode(challenge, admin, command, now);

    const consumed = await this.repository.consumeChallenge(challenge.id, now);
    if (!consumed) throw new AuthChallengeExpiredError();

    if (requiresReprotection) {
      await this.repository.updateTotpSecretCiphertext(
        admin.id,
        this.secretProtector.protect(admin.id, secret),
      );
    }

    const issued = await this.startSession.execute({
      admin,
      ipAddress: command.ipAddress,
      userAgent: command.userAgent,
      now,
    });
    await this.repository.recordAuditEvent({
      type: 'SESSION_CREATED',
      adminId: admin.id,
      ipAddress: command.ipAddress,
      userAgent: command.userAgent,
      metadata: { sessionId: issued.sessionId, enrollmentConfirmed: !admin.isTotpEnrolled },
    });

    return { ...issued, admin: { ...toPlatformAdminView(admin), lastLoginAt: now } };
  }

  private async rejectCode(
    challenge: PlatformAuthChallenge,
    admin: PlatformAdmin,
    command: VerifyTotpCommand,
    now: Date,
  ): Promise<never> {
    const failedAttempts = await this.repository.recordChallengeFailure(challenge.id);
    await this.repository.recordAuditEvent({
      type: 'TOTP_FAILED',
      adminId: admin.id,
      ipAddress: command.ipAddress,
      userAgent: command.userAgent,
      metadata: { failedAttempts },
    });

    const remainingAttempts = PlatformSessionPolicy.remainingTotpAttempts(failedAttempts);
    if (remainingAttempts === 0) {
      await this.repository.consumeChallenge(challenge.id, now);
      throw new AuthChallengeExpiredError();
    }
    throw new InvalidTotpCodeError(remainingAttempts);
  }

}
