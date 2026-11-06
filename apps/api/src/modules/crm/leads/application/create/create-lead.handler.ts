import { Inject, Injectable } from '@nestjs/common';
import { LeadCreationPolicy } from '../../domain/policies/lead-creation.policy.js';
import { LEAD_REPOSITORY, type LeadRepository } from '../../domain/repositories/lead.repository.js';
import { leadAudit } from '../shared/lead-audit.js';
import {
  assertLeadContactAvailable,
  normalizeLeadContactForPersistence,
} from '../shared/lead-contact-uniqueness.js';
import { resolveLeadTagIdsForWrite } from '../shared/resolve-lead-tag-ids.js';
import { enrichLeadReadModel, toLeadReadModel } from '../shared/lead-result.mapper.js';
import { LeadValidationError } from '../../domain/errors/lead.errors.js';
import type { CreateLeadCommand } from './create-lead.command.js';
import type { CreateLeadResult } from './create-lead.result.js';

@Injectable()
export class CreateLeadHandler {
  constructor(@Inject(LEAD_REPOSITORY) private readonly leads: LeadRepository) {}

  async execute(command: CreateLeadCommand): Promise<CreateLeadResult> {
    const { actor, input } = command;
    const validated = LeadCreationPolicy.validate({
      ...input,
      createdByAdminId: actor.adminId,
    });
    const contact = normalizeLeadContactForPersistence({
      phone: validated.phone,
      email: validated.email,
    });
    await assertLeadContactAvailable(this.leads, actor.organizationId, {
      phone: contact.phone ?? null,
      email: contact.email ?? null,
    });
    let tagIds: string[] | undefined;
    try {
      tagIds = await resolveLeadTagIdsForWrite(this.leads, actor.organizationId, validated);
    } catch (error) {
      throw new LeadValidationError(error instanceof Error ? error.message : 'Invalid tags.');
    }
    const leadId = crypto.randomUUID();
    const lead = await this.leads.createLead(
      actor.organizationId,
      {
        ...validated,
        ...contact,
        tagIds,
        createdByAdminId: actor.adminId,
      },
      leadAudit(actor, 'LEAD_CREATED', leadId),
    );
    const readModel = toLeadReadModel(lead);
    const tagMap = await this.leads.loadTagsByLeadIds(actor.organizationId, [lead.id]);
    return { lead: enrichLeadReadModel(readModel, tagMap.get(lead.id) ?? []) };
  }
}
