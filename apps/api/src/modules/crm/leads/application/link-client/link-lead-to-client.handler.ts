import { Inject, Injectable } from '@nestjs/common';
import { LeadConversionPolicy } from '../../domain/policies/lead-conversion.policy.js';
import { LEAD_REPOSITORY, type LeadRepository } from '../../domain/repositories/lead.repository.js';
import { leadAudit } from '../shared/lead-audit.js';
import { toLeadReadModel } from '../shared/lead-result.mapper.js';
import type { LinkLeadToClientCommand } from './link-lead-to-client.command.js';
import type { LinkLeadToClientResult } from './link-lead-to-client.result.js';

@Injectable()
export class LinkLeadToClientHandler {
  constructor(@Inject(LEAD_REPOSITORY) private readonly leads: LeadRepository) {}

  async execute(command: LinkLeadToClientCommand): Promise<LinkLeadToClientResult> {
    const { actor, leadId, clientId } = command;
    const existing = await this.leads.getLead(actor.organizationId, leadId);
    LeadConversionPolicy.assertLeadExistsForConversion(existing);
    const result = await this.leads.linkLeadToExistingClient(
      actor.organizationId,
      leadId,
      clientId,
      actor.adminId,
      leadAudit(actor, 'LEAD_LINKED_TO_CLIENT', leadId, { clientId }),
    );
    return { lead: toLeadReadModel(result.lead), client: result.client };
  }
}
