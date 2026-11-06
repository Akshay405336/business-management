import { ClientValidationError } from '../errors/client.errors.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_LENGTH = 254;

export class ClientEmail {
  private constructor(readonly value: string | null) {}

  static create(raw: string | null | undefined): ClientEmail {
    if (raw === undefined || raw === null || raw === '') {
      return new ClientEmail(null);
    }
    const value = raw.trim();
    if (value.length > MAX_LENGTH) {
      throw new ClientValidationError(`Email must be at most ${MAX_LENGTH} characters.`);
    }
    if (!EMAIL_PATTERN.test(value)) {
      throw new ClientValidationError('Enter a valid email address.');
    }
    return new ClientEmail(value);
  }
}
