import { Inject, Injectable } from '@nestjs/common';
import {
  PASSWORD_HASHER,
  TOTP_SECRET_GENERATOR,
  type PasswordHasher,
  type TotpSecretGenerator,
} from '../../../../infrastructure/security/security.contracts.js';
import { PlatformAdmin } from '../../domain/entities/platform-admin.entity.js';
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
import type { SynchronizeSuperAdminCommand } from './synchronize-super-admin.command.js';
import type { SynchronizeSuperAdminResult } from './synchronize-super-admin.result.js';

/**
 * Makes the Super Admin in `.env` the sole active platform administrator.
 * Every run hashes the current password, issues a new TOTP secret, and revokes
 * existing sessions and challenges so previous credentials cannot remain valid.
 */
@Injectable()
export class SynchronizeSuperAdminHandler {
  constructor(
    @Inject(PLATFORM_AUTH_REPOSITORY) private readonly repository: PlatformAuthRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(TOTP_SECRET_GENERATOR) private readonly totpSecrets: TotpSecretGenerator,
    @Inject(PLATFORM_TOTP_SECRET_PROTECTOR)
    private readonly secretProtector: PlatformTotpSecretProtector,
  ) {}

  async execute(command: SynchronizeSuperAdminCommand): Promise<SynchronizeSuperAdminResult> {
    const email = PlatformEmail.create(command.email);
    const now = new Date();
    const existing = await this.repository.findAdminByEmail(email);
    const adminId = existing?.id ?? crypto.randomUUID();
    const secret = PlatformTotpSecret.create(this.totpSecrets.generateSecret());
    const passwordHash = await this.passwordHasher.hash(command.password);
    const totpSecretCiphertext = this.secretProtector.protect(adminId, secret);

    const admin = existing
      ? this.applyToExisting(existing, command.displayName, passwordHash, totpSecretCiphertext, now)
      : PlatformAdmin.registerSuperAdmin({
          id: adminId,
          email,
          displayName: command.displayName,
          passwordHash,
          totpSecretCiphertext,
          now,
        });

    const persisted = await this.repository.replaceSoleSuperAdmin(admin, now, {
      type: existing ? 'SUPER_ADMIN_CREDENTIALS_RESET' : 'SUPER_ADMIN_BOOTSTRAPPED',
      adminId,
      ipAddress: null,
      userAgent: null,
      metadata: { source: 'environment-seed', passwordReset: true, totpRotated: true },
    });

    return {
      outcome: existing ? 'updated' : 'created',
      adminId,
      email: email.value,
      revokedSessions: persisted.revokedSessions,
      deactivatedAdmins: persisted.deactivatedAdmins,
      enrollment: {
        secret: secret.reveal(),
        otpauthUri: this.totpSecrets.buildEnrollmentUri({
          secret: secret.reveal(),
          accountName: email.value,
        }),
      },
    };
  }

  private applyToExisting(
    existing: PlatformAdmin,
    displayName: string,
    passwordHash: string,
    totpSecretCiphertext: string,
    now: Date,
  ): PlatformAdmin {
    existing.activate(now);
    existing.rename(displayName, now);
    existing.changePasswordHash(passwordHash, now);
    existing.replaceTotpSecret(totpSecretCiphertext, now);
    return existing;
  }
}
