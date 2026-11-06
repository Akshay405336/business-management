import { ClientValidationError } from '../errors/client.errors.js';

const MAX_LENGTH = 160;

export class ClientName {
  private constructor(readonly value: string) {}

  static create(raw: string): ClientName {
    const value = raw.trim();
    if (!value) {
      throw new ClientValidationError('Enter a client name.');
    }
    if (value.length > MAX_LENGTH) {
      throw new ClientValidationError(`Client name must be at most ${MAX_LENGTH} characters.`);
    }
    return new ClientName(value);
  }
}
