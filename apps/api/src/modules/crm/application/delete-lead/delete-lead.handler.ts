import { Inject, Injectable } from '@nestjs/common';
import {
  CRM_REPOSITORY,
  type CrmRepository,
} from '../../domain/repositories/crm.repository.js';
import type { DeleteLeadCommand } from './delete-lead.command.js';

@Injectable()
export class DeleteLeadHandler {
  constructor(@Inject(CRM_REPOSITORY) private readonly crm: CrmRepository) {}

  execute(command: DeleteLeadCommand): Promise<void> {
    const { actor, leadId } = command;
    return this.crm.deleteLead(actor.organizationId, leadId, {
      type: 'LEAD_DELETED',
      adminId: actor.adminId,
      entityType: 'lead',
      entityId: leadId,
    });
  }
}
