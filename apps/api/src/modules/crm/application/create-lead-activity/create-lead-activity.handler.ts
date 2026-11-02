import { Inject, Injectable } from '@nestjs/common';
import {
  CRM_REPOSITORY,
  type CrmRepository,
  type LeadActivityRecord,
} from '../../domain/repositories/crm.repository.js';
import type { CreateLeadActivityCommand } from './create-lead-activity.command.js';

@Injectable()
export class CreateLeadActivityHandler {
  constructor(@Inject(CRM_REPOSITORY) private readonly crm: CrmRepository) {}

  execute(command: CreateLeadActivityCommand): Promise<LeadActivityRecord> {
    const { actor, leadId, input } = command;
    return this.crm.createLeadActivity(actor.organizationId, leadId, {
      ...input,
      createdByAdminId: actor.adminId,
    });
  }
}
