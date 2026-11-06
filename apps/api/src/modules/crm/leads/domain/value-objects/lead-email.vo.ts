import { LeadValidationError } from '../errors/lead.errors.js';

const MAX_LENGTH = 254;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class LeadEmail {
  private constructor(readonly value: string | null) {}

  /** Optional email: null/blank is valid; non-empty must be a valid address. */
  static optional(raw: string | null | undefined): LeadEmail {
    if (raw === null || raw === undefined) {
      return new LeadEmail(null);
    }
    const trimmed = raw.trim();
    if (!trimmed) {
      return new LeadEmail(null);
    }
    if (trimmed.length > MAX_LENGTH) {
      throw new LeadValidationError('Enter a valid email address.');
    }
    if (!EMAIL_PATTERN.test(trimmed)) {
      throw new LeadValidationError('Enter a valid email address.');
    }
    return new LeadEmail(trimmed.toLowerCase());
  }
}
