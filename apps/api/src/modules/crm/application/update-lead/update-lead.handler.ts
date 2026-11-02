import { Inject, Injectable } from '@nestjs/common';
import {
  normalizedLeadEmailOrNull,
  normalizedLeadPhoneOrNull,
} from '@techwin/validation';
import {
  CRM_REPOSITORY,
  type CrmRepository,
  type LeadRecord,
} from '../../domain/repositories/crm.repository.js';
import {
  assertLeadContactAvailable,
  normalizeLeadContactForPersistence,
} from '../shared/lead-contact-uniqueness.js';
import { requireCrmEntity } from '../shared/require-crm-entity.js';
import type { UpdateLeadCommand } from './update-lead.command.js';

@Injectable()
export class UpdateLeadHandler {
  constructor(@Inject(CRM_REPOSITORY) private readonly crm: CrmRepository) {}

  async execute(command: UpdateLeadCommand): Promise<LeadRecord> {
    const { actor, leadId, input } = command;
    const existing = await requireCrmEntity(
      this.crm.getLead(actor.organizationId, leadId),
      'Lead',
    );
    const { archived, ...rest } = input;
    const contact = normalizeLeadContactForPersistence(rest);
    await assertLeadContactAvailable(
      this.crm,
      actor.organizationId,
      {
        phone:
          rest.phone !== undefined
            ? (contact.phone ?? null)
            : normalizedLeadPhoneOrNull(existing.phone),
        email:
          rest.email !== undefined
            ? (contact.email ?? null)
            : normalizedLeadEmailOrNull(existing.email),
      },
      { excludeLeadId: leadId },
    );
    return this.crm.updateLead(
      actor.organizationId,
      leadId,
      {
        ...rest,
        ...contact,
        archivedAt: archived === undefined ? undefined : archived ? new Date() : null,
      },
      {
        type: archived ? 'LEAD_ARCHIVED' : 'LEAD_UPDATED',
        adminId: actor.adminId,
        entityType: 'lead',
        entityId: leadId,
      },
    );
  }
}
