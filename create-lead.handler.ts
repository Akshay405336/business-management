import { Inject, Injectable } from '@nestjs/common';


import {
  CRM_REPOSITORY,
  type CrmRepository,
  type LeadRecord,
} from '../../domain/repositories/crm.repository.js';
import {
  assertLeadContactAvailable,
  normalizeLeadContactForPersistence,
} from '../shared/lead-contact-uniqueness.js';
import type { CreateLeadCommand } from './create-lead.command.js';

@Injectable()
export class CreateLeadHandler {
  constructor(@Inject(CRM_REPOSITORY) private readonly crm: CrmRepository) {}

  async execute(command: CreateLeadCommand): Promise<LeadRecord> {
    const { actor, input } = command;
    const contact = normalizeLeadContactForPersistence({
      phone: input.phone,
      email: input.email,
    });
    await assertLeadContactAvailable(this.crm, actor.organizationId, {
      phone: contact.phone ?? null,
      email: contact.email ?? null,
    });
    const leadId = crypto.randomUUID();
    return this.crm.createLead(
      actor.organizationId,
      {
        ...input,
        ...contact,
        createdByAdminId: actor.adminId,
      },
      {
        type: 'LEAD_CREATED',
        adminId: actor.adminId,
        entityType: 'lead',
        entityId: leadId,
      },
    );
  }
}
