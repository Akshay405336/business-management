import { Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../../../../config/app-config.js';
import {
  deriveKeyId,
  EnvelopeDecryptionError,
  openEnvelope,
  parseEnvelope,
  sealEnvelope,
} from '../../../../infrastructure/security/encryption/aes-gcm-envelope.js';
import type {
  PlatformTotpSecretProtector,
  RevealedTotpSecret,
} from '../../domain/services/platform-totp-secret-protector.js';
import { PlatformTotpSecret } from '../../domain/value-objects/platform-totp-secret.js';
import { LegacyTotpCiphertext } from './legacy-totp-ciphertext.js';

export class TotpSecretUnavailableError extends Error {
  constructor() {
    super(
      'A stored TOTP secret could not be decrypted. Check TOTP_ENCRYPTION_KEY and ' +
        'TOTP_ENCRYPTION_PREVIOUS_KEYS; never replace the key of an environment with enrolled admins.',
    );
    this.name = 'TotpSecretUnavailableError';
  }
}

/** Seals TOTP secrets with AES-256-GCM, bound to the owning administrator id. */
@Injectable()
export class PlatformTotpSecretResolver implements PlatformTotpSecretProtector {
  private readonly currentKeyId: string;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {
    this.currentKeyId = deriveKeyId(config.totp.encryptionKey);
  }

  protect(adminId: string, secret: PlatformTotpSecret): string {
    return sealEnvelope(this.config.totp.encryptionKey, secret.reveal(), associatedData(adminId));
  }

  reveal(adminId: string, ciphertext: string): RevealedTotpSecret {
    try {
      const envelope = parseEnvelope(ciphertext);
      if (envelope.keyId === this.currentKeyId) {
        return {
          secret: PlatformTotpSecret.create(
            openEnvelope(this.config.totp.encryptionKey, envelope, associatedData(adminId)),
          ),
          requiresReprotection: false,
        };
      }

      const legacy = LegacyTotpCiphertext.match(envelope, this.config.totp.previousEncryptionKeys);
      if (!legacy) throw new TotpSecretUnavailableError();
      return {
        secret: PlatformTotpSecret.create(legacy.open(associatedData(adminId))),
        requiresReprotection: true,
      };
    } catch (error) {
      if (error instanceof EnvelopeDecryptionError) throw new TotpSecretUnavailableError();
      throw error;
    }
  }
}

const associatedData = (adminId: string): string => `techwin:platform-admin:${adminId}:totp`;
