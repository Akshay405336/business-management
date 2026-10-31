import { Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../../../../config/app-config.js';
import {
  deriveKeyId,
  openEnvelope,
  parseEnvelope,
  sealEnvelope,
} from '../../../../infrastructure/security/encryption/aes-gcm-envelope.js';
import { WhatsAppNotConfiguredError } from '../../domain/whatsapp.errors.js';
import type { WhatsAppCredentialCipherPort } from '../../domain/whatsapp.ports.js';

/**
 * AES-256-GCM envelopes keyed by `WHATSAPP_CREDENTIALS_ENCRYPTION_KEY`. Previous
 * keys stay readable so the key can be rotated without re-entering credentials.
 */
@Injectable()
export class AesGcmWhatsAppCredentialCipher implements WhatsAppCredentialCipherPort {
  private readonly currentKey: Buffer | null;
  private readonly keysById: ReadonlyMap<string, Buffer>;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    this.currentKey = config.whatsapp.credentialsEncryptionKey;
    const keys = [
      ...(this.currentKey ? [this.currentKey] : []),
      ...config.whatsapp.previousCredentialsEncryptionKeys,
    ];
    this.keysById = new Map(keys.map((key) => [deriveKeyId(key), key]));
  }

  isConfigured(): boolean {
    return this.currentKey !== null;
  }

  seal(plaintext: string, associatedData: string): string {
    if (!this.currentKey) {
      throw new WhatsAppNotConfiguredError(
        'WhatsApp credential encryption is not configured. Set WHATSAPP_CREDENTIALS_ENCRYPTION_KEY on the API server.',
      );
    }
    return sealEnvelope(this.currentKey, plaintext, associatedData);
  }

  open(envelope: string, associatedData: string): string {
    const parsed = parseEnvelope(envelope);
    const key = this.keysById.get(parsed.keyId);
    if (!key) {
      throw new WhatsAppNotConfiguredError(
        'Stored WhatsApp credentials were encrypted with a key that is no longer configured.',
      );
    }
    return openEnvelope(key, parsed, associatedData);
  }
}
