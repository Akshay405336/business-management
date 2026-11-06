import type { UpdateLeadData } from '../types/lead.types.js';
import { Lead } from '../entities/lead.entity.js';

export class LeadUpdatePolicy {
  static validate(input: UpdateLeadData): UpdateLeadData {
    return Lead.validateUpdate(input);
  }
}
