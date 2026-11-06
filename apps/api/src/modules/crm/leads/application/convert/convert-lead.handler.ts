import { Inject, Injectable } from '@nestjs/common';
import { LeadConversionPolicy } from '../../domain/policies/lead-conversion.policy.js';
import { LEAD_REPOSITORY, type LeadRepository } from '../../domain/repositories/lead.repository.js';
import { leadAudit } from '../shared/lead-audit.js';
import { toLeadReadModel } from '../shared/lead-result.mapper.js';
import type { ConvertLeadCommand } from './convert-lead.command.js';
import type { ConvertLeadResult } from './convert-lead.result.js';

@Injectable()
export class ConvertLeadHandler {
  constructor(@Inject(LEAD_REPOSITORY) private readonly leads: LeadRepository) {}

  async execute(command: ConvertLeadCommand): Promise<ConvertLeadResult> {
    const { actor, leadId } = command;
    const existing = await this.leads.getLead(actor.organizationId, leadId);
    LeadConversionPolicy.assertLeadExistsForConversion(existing);
    const result = await this.leads.convertLeadToClient(
      actor.organizationId,
      leadId,
      actor.adminId,
      leadAudit(actor, 'LEAD_CONVERTED', leadId),
    );
    return { lead: toLeadReadModel(result.lead), client: result.client };
  }
}
