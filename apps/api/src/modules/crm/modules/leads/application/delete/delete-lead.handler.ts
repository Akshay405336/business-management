import { Inject, Injectable } from '@nestjs/common';
import { LEAD_REPOSITORY, type LeadRepository } from '../../domain/repositories/lead.repository.js';
import { leadAudit } from '../shared/lead-audit.js';
import type { DeleteLeadCommand } from './delete-lead.command.js';
import type { DeleteLeadResult } from './delete-lead.result.js';

@Injectable()
export class DeleteLeadHandler {
  constructor(@Inject(LEAD_REPOSITORY) private readonly leads: LeadRepository) {}

  async execute(command: DeleteLeadCommand): Promise<DeleteLeadResult> {
    const { actor, leadId } = command;
    await this.leads.deleteLead(
      actor.organizationId,
      leadId,
      leadAudit(actor, 'LEAD_DELETED', leadId),
    );
    return { leadId };
  }
}
