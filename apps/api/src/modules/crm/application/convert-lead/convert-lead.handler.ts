import { Inject, Injectable } from '@nestjs/common';
import {
  CRM_REPOSITORY,
  type CrmRepository,
} from '../../domain/repositories/crm.repository.js';
import type { ConvertLeadCommand } from './convert-lead.command.js';

@Injectable()
export class ConvertLeadHandler {
  constructor(@Inject(CRM_REPOSITORY) private readonly crm: CrmRepository) {}

  execute(command: ConvertLeadCommand) {
    const { actor, leadId } = command;
    return this.crm.convertLeadToClient(actor.organizationId, leadId, actor.adminId, {
      type: 'LEAD_CONVERTED',
      adminId: actor.adminId,
      entityType: 'lead',
      entityId: leadId,
    });
  }
}
