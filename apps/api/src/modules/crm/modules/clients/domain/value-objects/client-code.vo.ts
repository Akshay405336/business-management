import { ClientValidationError } from '../errors/client.errors.js';

const REFERENCE_PATTERN = /^CL-\d{6}$/;

export class ClientCode {
  private constructor(readonly value: string) {}

  static assertFormat(referenceNumber: string): ClientCode {
    if (!REFERENCE_PATTERN.test(referenceNumber)) {
      throw new ClientValidationError('Invalid client reference number format.');
    }
    return new ClientCode(referenceNumber);
  }
}
