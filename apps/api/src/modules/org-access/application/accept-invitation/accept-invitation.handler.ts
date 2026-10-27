import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  PASSWORD_HASHER,
  TOTP_SECRET_GENERATOR,
  type PasswordHasher,
  type TotpSecretGenerator,
} from '../../../../infrastructure/security/security.contracts.js';
import {
  PLATFORM_TOTP_SECRET_PROTECTOR,
  type PlatformTotpSecretProtector,
} from '../../../auth/domain/services/platform-totp-secret-protector.js';
import { PlatformTotpSecret } from '../../../auth/domain/value-objects/platform-totp-secret.js';
import {
  ORG_ACCESS_REPOSITORY,
  type OrgAccessRepository,
} from '../../domain/repositories/org-access.repository.js';

export type AcceptInvitationCommand = {
  readonly acceptToken: string;
  readonly displayName: string;
  readonly password: string;
};

@Injectable()
export class AcceptInvitationHandler {
  constructor(
    @Inject(ORG_ACCESS_REPOSITORY) private readonly repository: OrgAccessRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(TOTP_SECRET_GENERATOR) private readonly totpSecrets: TotpSecretGenerator,
    @Inject(PLATFORM_TOTP_SECRET_PROTECTOR)
    private readonly secretProtector: PlatformTotpSecretProtector,
  ) {}

  async execute(command: AcceptInvitationCommand): Promise<{ organizationId: string; adminId: string }> {
    const newAdminId = randomUUID();
    const passwordHash = await this.passwordHasher.hash(command.password);
    const secret = PlatformTotpSecret.create(this.totpSecrets.generateSecret());
    const totpSecretCiphertext = this.secretProtector.protect(newAdminId, secret);
    return this.repository.acceptInvitation({
      acceptToken: command.acceptToken,
      displayName: command.displayName,
      passwordHash,
      totpSecretCiphertext,
      newAdminId,
    });
  }
}
