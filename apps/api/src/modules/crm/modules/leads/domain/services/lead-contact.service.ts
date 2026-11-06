import { LeadEmail } from '../value-objects/lead-email.vo.js';
import { LeadPhone } from '../value-objects/lead-phone.vo.js';

/** Normalizes contact fields for persistence (domain boundary). */
export class LeadContactService {
  static normalizeForPersistence(input: {
    readonly phone?: string | null;
    readonly email?: string | null;
  }): { phone?: string | null; email?: string | null } {
    const normalized: { phone?: string | null; email?: string | null } = {};
    if (input.phone !== undefined) {
      normalized.phone = LeadPhone.optional(input.phone).value;
    }
    if (input.email !== undefined) {
      normalized.email = LeadEmail.optional(input.email).value;
    }
    return normalized;
  }
}
