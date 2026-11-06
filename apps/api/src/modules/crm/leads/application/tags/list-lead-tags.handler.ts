import { Inject, Injectable } from '@nestjs/common';
import { LEAD_REPOSITORY, type LeadRepository } from '../../domain/repositories/lead.repository.js';

@Injectable()
export class ListLeadTagsHandler {
  constructor(@Inject(LEAD_REPOSITORY) private readonly leads: LeadRepository) {}

  execute(input: { readonly organizationId: string; readonly search?: string }) {
    return this.leads.listLeadTags(input.organizationId, input.search);
  }
}
