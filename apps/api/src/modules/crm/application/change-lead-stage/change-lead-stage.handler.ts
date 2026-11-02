import { Inject, Injectable } from '@nestjs/common';
import {
  CRM_REPOSITORY,
  type CrmRepository,
  type LeadRecord,
} from '../../domain/repositories/crm.repository.js';
import type { ChangeLeadStageCommand } from './change-lead-stage.command.js';

@Injectable()
export class ChangeLeadStageHandler {
  constructor(@Inject(CRM_REPOSITORY) private readonly crm: CrmRepository) {}

  execute(command: ChangeLeadStageCommand): Promise<LeadRecord> {
    const { actor, leadId, stageId, beforeLeadId } = command;
    return this.crm.changeLeadStage(
      actor.organizationId,
      leadId,
      stageId,
      beforeLeadId,
      actor.adminId,
      {
        type: 'LEAD_STAGE_CHANGED',
        adminId: actor.adminId,
        entityType: 'lead',
        entityId: leadId,
        metadata: { stageId, beforeLeadId: beforeLeadId ?? null },
      },
    );
  }
}
