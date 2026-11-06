import { Inject, Injectable } from '@nestjs/common';
import { LEAD_REPOSITORY, type LeadRepository } from '../../domain/repositories/lead.repository.js';
import { toLeadActivityReadModel } from '../shared/lead-result.mapper.js';
import type { CreateLeadActivityCommand } from './create-lead-activity.command.js';
import type { CreateLeadActivityResult } from './create-lead-activity.result.js';

@Injectable()
export class CreateLeadActivityHandler {
  constructor(@Inject(LEAD_REPOSITORY) private readonly leads: LeadRepository) {}

  async execute(command: CreateLeadActivityCommand): Promise<CreateLeadActivityResult> {
    const { actor, leadId, input } = command;
    const activity = await this.leads.createLeadActivity(actor.organizationId, leadId, {
      ...input,
      createdByAdminId: actor.adminId,
    });
    return { activity: toLeadActivityReadModel(activity) };
  }
}
