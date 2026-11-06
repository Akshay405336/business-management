import type { CreateLeadData } from '../types/lead.types.js';
import { Lead } from '../entities/lead.entity.js';
import { LeadValidationError } from '../errors/lead.errors.js';

export class LeadCreationPolicy {
  static validate(input: CreateLeadData): CreateLeadData {
    Lead.validateCreate(input);
    if (!input.pipelineId.trim()) {
      throw new LeadValidationError('Pipeline is required.');
    }
    return input;
  }
}
