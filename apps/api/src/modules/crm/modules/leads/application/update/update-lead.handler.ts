import { Inject, Injectable } from '@nestjs/common';
import { LeadUpdatePolicy } from '../../domain/policies/lead-update.policy.js';
import { LEAD_REPOSITORY, type LeadRepository } from '../../domain/repositories/lead.repository.js';
import { LeadContactService } from '../../domain/services/lead-contact.service.js';
import { requireCrmEntity } from '../../../../shared/application/require-crm-entity.js';
import { leadAudit } from '../shared/lead-audit.js';
import {
  assertLeadContactAvailable,
  normalizeLeadContactForPersistence,
} from '../shared/lead-contact-uniqueness.js';
import { resolveLeadTagIdsForWrite } from '../shared/resolve-lead-tag-ids.js';
import { enrichLeadReadModel, toLeadReadModel } from '../shared/lead-result.mapper.js';
import { LeadValidationError } from '../../domain/errors/lead.errors.js';
import type { UpdateLeadCommand } from './update-lead.command.js';
import type { UpdateLeadResult } from './update-lead.result.js';

@Injectable()
export class UpdateLeadHandler {
  constructor(@Inject(LEAD_REPOSITORY) private readonly leads: LeadRepository) {}

  async execute(command: UpdateLeadCommand): Promise<UpdateLeadResult> {
    const { actor, leadId, input } = command;
    const existing = await requireCrmEntity(
      this.leads.getLead(actor.organizationId, leadId),
      'Lead',
    );
    const { archived, ...rest } = input;
    const validated = LeadUpdatePolicy.validate(rest);
    const contact = normalizeLeadContactForPersistence(validated);
    const existingContact = LeadContactService.normalizeForPersistence({
      phone: existing.toReadModel().phone,
      email: existing.toReadModel().email,
    });
    await assertLeadContactAvailable(
      this.leads,
      actor.organizationId,
      {
        phone: rest.phone !== undefined ? (contact.phone ?? null) : (existingContact.phone ?? null),
        email: rest.email !== undefined ? (contact.email ?? null) : (existingContact.email ?? null),
      },
      { excludeLeadId: leadId },
    );
    let tagIds: string[] | undefined;
    try {
      tagIds = await resolveLeadTagIdsForWrite(this.leads, actor.organizationId, validated);
    } catch (error) {
      throw new LeadValidationError(error instanceof Error ? error.message : 'Invalid tags.');
    }
    const lead = await this.leads.updateLead(
      actor.organizationId,
      leadId,
      {
        ...validated,
        ...contact,
        tagIds,
        archivedAt: archived === undefined ? undefined : archived ? new Date() : null,
      },
      leadAudit(actor, archived ? 'LEAD_ARCHIVED' : 'LEAD_UPDATED', leadId),
    );
    const readModel = toLeadReadModel(lead);
    const tagMap = await this.leads.loadTagsByLeadIds(actor.organizationId, [leadId]);
    return { lead: enrichLeadReadModel(readModel, tagMap.get(leadId) ?? []) };
  }
}
