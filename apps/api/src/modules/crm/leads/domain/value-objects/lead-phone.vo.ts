import { LeadValidationError } from '../errors/lead.errors.js';

const MAX_LENGTH = 32;

export class LeadPhone {
  private constructor(readonly value: string | null) {}

  static optional(raw: string | null | undefined): LeadPhone {
    if (raw === null || raw === undefined) {
      return new LeadPhone(null);
    }
    const digits = raw.replace(/\D/g, '');
    if (!digits) {
      return new LeadPhone(null);
    }
    if (digits.length > MAX_LENGTH) {
      throw new LeadValidationError('Enter a valid phone number.');
    }
    return new LeadPhone(digits);
  }

  /** Required phone for lead create/update payloads that include phone. */
  static required(raw: string): LeadPhone {
    const phone = LeadPhone.optional(raw);
    if (!phone.value) {
      throw new LeadValidationError('Enter a phone number.');
    }
    return phone;
  }
}
