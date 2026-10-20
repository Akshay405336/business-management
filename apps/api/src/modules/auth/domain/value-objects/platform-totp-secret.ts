import { InvalidAuthInputError } from '../errors/platform-auth.errors.js';

const BASE32_PATTERN = /^[A-Z2-7]+=*$/;
/** 32 Base32 characters = 160 bits, the RFC 4226 recommended secret size. */
const MIN_LENGTH = 32;

/**
 * Plaintext TOTP shared secret. It only exists in memory while a code is being
 * verified or an authenticator is being enrolled, and it refuses to serialize
 * itself so it cannot leak into logs or responses by accident.
 */
export class PlatformTotpSecret {
  readonly #value: string;

  private constructor(value: string) {
    this.#value = value;
  }

  static create(raw: string): PlatformTotpSecret {
    const normalized = raw.replace(/\s+/g, '').toUpperCase();
    if (normalized.length < MIN_LENGTH || !BASE32_PATTERN.test(normalized)) {
      throw new InvalidAuthInputError('Invalid TOTP secret.');
    }
    return new PlatformTotpSecret(normalized);
  }

  reveal(): string {
    return this.#value;
  }

  toString(): string {
    return '[PlatformTotpSecret]';
  }

  toJSON(): string {
    return '[PlatformTotpSecret]';
  }
}
