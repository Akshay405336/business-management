import { SessionNotFoundError } from '../errors/platform-auth.errors.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class PlatformSessionId {
  private constructor(readonly value: string) {}

  static generate(): PlatformSessionId {
    return new PlatformSessionId(crypto.randomUUID());
  }

  /** An identifier that is not a UUID can never match a session. */
  static parse(raw: string): PlatformSessionId {
    if (!UUID_PATTERN.test(raw)) throw new SessionNotFoundError();
    return new PlatformSessionId(raw.toLowerCase());
  }

  equals(other: PlatformSessionId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
