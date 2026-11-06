import { ClientValidationError } from '../errors/client.errors.js';

const MAX_LENGTH = 32;

export class ClientPhone {
  private constructor(readonly value: string) {}

  /** Required for new clients and when updating phone; must be a valid stored form. */
  static createRequired(raw: string | null | undefined): ClientPhone {
    if (raw === undefined || raw === null || raw === '') {
      throw new ClientValidationError('Phone number is required.');
    }
    const value = raw.trim();
    if (!value) {
      throw new ClientValidationError('Phone number is required.');
    }
    if (value.length > MAX_LENGTH) {
      throw new ClientValidationError(`Phone must be at most ${MAX_LENGTH} characters.`);
    }
    return new ClientPhone(value);
  }

  /**
   * Optional phone (e.g. legacy rows or omitted patch field).
   * Do not use for create — use {@link createRequired}.
   */
  static createOptional(raw: string | null | undefined): ClientPhone | null {
    if (raw === undefined || raw === null || raw === '') return null;
    const value = raw.trim();
    if (!value) return null;
    if (value.length > MAX_LENGTH) {
      throw new ClientValidationError(`Phone must be at most ${MAX_LENGTH} characters.`);
    }
    return new ClientPhone(value);
  }
}
