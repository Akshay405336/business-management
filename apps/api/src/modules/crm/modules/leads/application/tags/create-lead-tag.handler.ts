import { Inject, Injectable } from '@nestjs/common';
import { LEAD_REPOSITORY, type LeadRepository } from '../../domain/repositories/lead.repository.js';
import type { CreateLeadTagData } from '../../domain/types/lead-tag.types.js';

@Injectable()
export class CreateLeadTagHandler {
  constructor(@Inject(LEAD_REPOSITORY) private readonly leads: LeadRepository) {}

  execute(input: { readonly organizationId: string; readonly data: CreateLeadTagData }) {
    return this.leads.createLeadTag(input.organizationId, input.data);
  }
}
