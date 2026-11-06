import { Inject, Injectable } from '@nestjs/common';
import type { CrmActor } from '../../../../shared/application/crm-actor.js';
import { LEAD_REPOSITORY, type LeadRepository } from '../../domain/repositories/lead.repository.js';
import type { LeadImportRowInput } from '../../domain/types/lead-import.types.js';
import { leadAudit } from '../shared/lead-audit.js';

@Injectable()
export class ExecuteLeadImportHandler {
  constructor(@Inject(LEAD_REPOSITORY) private readonly leads: LeadRepository) {}

  execute(input: {
    readonly actor: CrmActor;
    readonly pipelineId: string;
    readonly rows: readonly LeadImportRowInput[];
  }) {
    return this.leads.executeLeadImport(
      input.actor.organizationId,
      input.pipelineId,
      input.rows,
      input.actor.adminId,
      leadAudit(input.actor, 'LEAD_CREATED', input.pipelineId, { importBatch: true }),
    );
  }
}
