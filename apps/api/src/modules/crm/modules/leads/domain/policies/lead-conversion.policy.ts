import { LeadNotFoundError } from '../errors/lead.errors.js';
import type { Lead } from '../entities/lead.entity.js';

export class LeadConversionPolicy {
  /** Idempotent conversion: already converted leads return existing client id. */
  static existingClientIdIfConverted(lead: Lead): string | null {
    return lead.convertedClientId;
  }

  static assertLeadExistsForConversion(lead: Lead | null): asserts lead is Lead {
    if (!lead) {
      throw new LeadNotFoundError('Lead');
    }
  }
}
