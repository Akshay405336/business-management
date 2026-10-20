import {
  deriveKeyId,
  openEnvelope,
  type ParsedEnvelope,
} from '../../../../infrastructure/security/encryption/aes-gcm-envelope.js';

/**
 * TOTP ciphertext sealed with a retired encryption key.
 *
 * When `TOTP_ENCRYPTION_KEY` is rotated, the previous key moves to
 * `TOTP_ENCRYPTION_PREVIOUS_KEYS`. Secrets sealed with it stay readable through
 * this class and are re-sealed with the current key after the next successful
 * sign-in, so rotation never locks an administrator out.
 */
export class LegacyTotpCiphertext {
  private constructor(
    private readonly envelope: ParsedEnvelope,
    private readonly key: Buffer,
  ) {}

  /** Returns `null` when no retired key matches the envelope's key id. */
  static match(
    envelope: ParsedEnvelope,
    retiredKeys: readonly Buffer[],
  ): LegacyTotpCiphertext | null {
    const key = retiredKeys.find((candidate) => deriveKeyId(candidate) === envelope.keyId);
    return key ? new LegacyTotpCiphertext(envelope, key) : null;
  }

  open(associatedData: string): string {
    return openEnvelope(this.key, this.envelope, associatedData);
  }
}
