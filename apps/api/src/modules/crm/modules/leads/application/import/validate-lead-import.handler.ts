import { Inject, Injectable } from '@nestjs/common';
import type { CrmActor } from '../../../../shared/application/crm-actor.js';
import { LEAD_REPOSITORY, type LeadRepository } from '../../domain/repositories/lead.repository.js';
import type { LeadImportRowInput } from '../../domain/types/lead-import.types.js';

@Injectable()
export class ValidateLeadImportHandler {
  constructor(@Inject(LEAD_REPOSITORY) private readonly leads: LeadRepository) {}

  execute(input: {
    readonly actor: CrmActor;
    readonly pipelineId: string;
    readonly rows: readonly LeadImportRowInput[];
  }) {
    return this.leads.previewLeadImport(input.actor.organizationId, input.pipelineId, input.rows);
  }
}
