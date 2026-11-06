import { Inject, Injectable } from '@nestjs/common';
import { LEAD_REPOSITORY, type LeadRepository } from '../../domain/repositories/lead.repository.js';
import { leadAudit } from '../shared/lead-audit.js';
import { toLeadReadModel } from '../shared/lead-result.mapper.js';
import type { ChangeLeadStageCommand } from './change-lead-stage.command.js';
import type { ChangeLeadStageResult } from './change-lead-stage.result.js';

@Injectable()
export class ChangeLeadStageHandler {
  constructor(@Inject(LEAD_REPOSITORY) private readonly leads: LeadRepository) {}

  async execute(command: ChangeLeadStageCommand): Promise<ChangeLeadStageResult> {
    const { actor, leadId, stageId, beforeLeadId } = command;
    const lead = await this.leads.changeLeadStage(
      actor.organizationId,
      leadId,
      stageId,
      beforeLeadId,
      actor.adminId,
      leadAudit(actor, 'LEAD_STAGE_CHANGED', leadId, {
        stageId,
        beforeLeadId: beforeLeadId ?? null,
      }),
    );
    return { lead: toLeadReadModel(lead) };
  }
}
