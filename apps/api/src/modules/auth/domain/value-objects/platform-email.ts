import { InvalidAuthInputError } from '../errors/platform-auth.errors.js';

const MAX_LENGTH = 254;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Email address normalized to its canonical (trimmed, lower-case) form. */
export class PlatformEmail {
  private constructor(readonly value: string) {}

  static create(raw: string): PlatformEmail {
    const normalized = raw.trim().toLowerCase();
    if (
      normalized.length === 0 ||
      normalized.length > MAX_LENGTH ||
      !EMAIL_PATTERN.test(normalized)
    ) {
      throw new InvalidAuthInputError('Invalid email address.');
    }
    return new PlatformEmail(normalized);
  }

  equals(other: PlatformEmail): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
