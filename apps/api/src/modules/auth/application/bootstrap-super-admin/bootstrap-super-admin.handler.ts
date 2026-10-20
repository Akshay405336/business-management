import { Inject, Injectable } from '@nestjs/common';
import {
  PASSWORD_HASHER,
  TOTP_SECRET_GENERATOR,
  type PasswordHasher,
  type TotpSecretGenerator,
} from '../../../../infrastructure/security/security.contracts.js';
import { PlatformAdmin } from '../../domain/entities/platform-admin.entity.js';
import { InvalidAuthInputError } from '../../domain/errors/platform-auth.errors.js';
import {
  PLATFORM_AUTH_REPOSITORY,
  type PlatformAuthRepository,
} from '../../domain/repositories/platform-auth.repository.js';
import {
  PLATFORM_TOTP_SECRET_PROTECTOR,
  type PlatformTotpSecretProtector,
} from '../../domain/services/platform-totp-secret-protector.js';
import { PlatformEmail } from '../../domain/value-objects/platform-email.js';
import { PlatformTotpSecret } from '../../domain/value-objects/platform-totp-secret.js';
import type { BootstrapSuperAdminCommand } from './bootstrap-super-admin.command.js';
import type { BootstrapSuperAdminResult } from './bootstrap-super-admin.result.js';

/**
 * Idempotently provisions the first Super Admin. Re-running it for an existing
 * account changes nothing unless a password reset or TOTP rotation is requested.
 */
@Injectable()
export class BootstrapSuperAdminHandler {
  constructor(
    @Inject(PLATFORM_AUTH_REPOSITORY) private readonly repository: PlatformAuthRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(TOTP_SECRET_GENERATOR) private readonly totpSecrets: TotpSecretGenerator,
    @Inject(PLATFORM_TOTP_SECRET_PROTECTOR)
    private readonly secretProtector: PlatformTotpSecretProtector,
  ) {}

  async execute(command: BootstrapSuperAdminCommand): Promise<BootstrapSuperAdminResult> {
    const email = PlatformEmail.create(command.email);
    const now = new Date();
    const existing = await this.repository.findAdminByEmail(email);
    const passwordNeeded = !existing || command.resetPassword;

    if (passwordNeeded && !command.password) {
      return {
        outcome: 'password_required',
        adminId: existing?.id ?? null,
        email: email.value,
        totpEnrolled: existing?.isTotpEnrolled ?? false,
        passwordReset: false,
        revokedSessions: 0,
        enrollment: null,
      };
    }

    if (!existing) return this.create(command, email, now);

    if (!command.resetPassword && !command.rotateTotp) {
      return {
        outcome: 'unchanged',
        adminId: existing.id,
        email: existing.email.value,
        totpEnrolled: existing.isTotpEnrolled,
        passwordReset: false,
        revokedSessions: 0,
        enrollment: null,
      };
    }

    if (command.resetPassword) {
      existing.changePasswordHash(
        await this.passwordHasher.hash(this.requirePassword(command)),
        now,
      );
    }
    let enrollment: BootstrapSuperAdminResult['enrollment'] = null;
    if (command.rotateTotp) {
      const secret = PlatformTotpSecret.create(this.totpSecrets.generateSecret());
      existing.replaceTotpSecret(this.secretProtector.protect(existing.id, secret), now);
      enrollment = this.enrollmentFor(existing.email, secret);
    }

    await this.repository.saveAdminCredentials(existing);
    const revokedSessions = await this.repository.revokeAllSessions(
      existing.id,
      'CREDENTIALS_RESET',
      now,
    );
    await this.repository.recordAuditEvent({
      type: 'SUPER_ADMIN_CREDENTIALS_RESET',
      adminId: existing.id,
      ipAddress: null,
      userAgent: null,
      metadata: { passwordReset: command.resetPassword, totpRotated: command.rotateTotp },
    });

    return {
      outcome: 'updated',
      adminId: existing.id,
      email: existing.email.value,
      totpEnrolled: existing.isTotpEnrolled,
      passwordReset: command.resetPassword,
      revokedSessions,
      enrollment,
    };
  }

  private async create(
    command: BootstrapSuperAdminCommand,
    email: PlatformEmail,
    now: Date,
  ): Promise<BootstrapSuperAdminResult> {
    const adminId = crypto.randomUUID();
    const secret = PlatformTotpSecret.create(this.totpSecrets.generateSecret());
    const admin = PlatformAdmin.registerSuperAdmin({
      id: adminId,
      email,
      displayName: command.displayName,
      passwordHash: await this.passwordHasher.hash(this.requirePassword(command)),
      totpSecretCiphertext: this.secretProtector.protect(adminId, secret),
      now,
    });

    await this.repository.createAdmin(admin);
    await this.repository.recordAuditEvent({
      type: 'SUPER_ADMIN_BOOTSTRAPPED',
      adminId,
      ipAddress: null,
      userAgent: null,
    });

    return {
      outcome: 'created',
      adminId,
      email: email.value,
      totpEnrolled: false,
      passwordReset: false,
      revokedSessions: 0,
      enrollment: this.enrollmentFor(email, secret),
    };
  }

  private requirePassword(command: BootstrapSuperAdminCommand): string {
    if (!command.password) throw new InvalidAuthInputError('A password is required.');
    return command.password;
  }

  private enrollmentFor(email: PlatformEmail, secret: PlatformTotpSecret) {
    return {
      secret: secret.reveal(),
      otpauthUri: this.totpSecrets.buildEnrollmentUri({
        secret: secret.reveal(),
        accountName: email.value,
      }),
    };
  }
}
