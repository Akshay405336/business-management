import type { PlatformTotpSecret } from '../value-objects/platform-totp-secret.js';

export const PLATFORM_TOTP_SECRET_PROTECTOR = Symbol('PLATFORM_TOTP_SECRET_PROTECTOR');

export interface RevealedTotpSecret {
  readonly secret: PlatformTotpSecret;
  /** True when the stored ciphertext uses a retired key and should be re-sealed. */
  readonly requiresReprotection: boolean;
}

/**
 * Encryption-at-rest policy for administrator TOTP secrets. Ciphertexts are
 * bound to the owning administrator so they cannot be moved between accounts.
 */
export interface PlatformTotpSecretProtector {
  protect(adminId: string, secret: PlatformTotpSecret): string;
  reveal(adminId: string, ciphertext: string): RevealedTotpSecret;
}
