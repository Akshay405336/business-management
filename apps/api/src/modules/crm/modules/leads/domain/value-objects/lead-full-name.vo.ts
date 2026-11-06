import { LeadValidationError } from '../errors/lead.errors.js';

const MAX_LENGTH = 160;

export class LeadFullName {
  private constructor(readonly value: string) {}

  static create(raw: string): LeadFullName {
    const value = raw.trim();
    if (!value) {
      throw new LeadValidationError('Enter a name.');
    }
    if (value.length > MAX_LENGTH) {
      throw new LeadValidationError(`Name must be at most ${MAX_LENGTH} characters.`);
    }
    return new LeadFullName(value);
  }
}
