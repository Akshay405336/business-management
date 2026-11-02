import { Inject, Injectable } from '@nestjs/common';
import {
  CRM_REPOSITORY,
  type CrmRepository,
  type PipelineStageRecord,
} from '../../domain/repositories/crm.repository.js';
import type { DeactivatePipelineStageCommand } from './deactivate-pipeline-stage.command.js';

@Injectable()
export class DeactivatePipelineStageHandler {
  constructor(@Inject(CRM_REPOSITORY) private readonly crm: CrmRepository) {}

  execute(command: DeactivatePipelineStageCommand): Promise<PipelineStageRecord> {
    const { actor, pipelineId, stageId, targetStageId } = command;
    return this.crm.deactivateStage(actor.organizationId, pipelineId, stageId, targetStageId, {
      type: 'STAGE_UPDATED',
      adminId: actor.adminId,
      entityType: 'pipeline_stage',
      entityId: stageId,
      metadata: { action: 'deactivate' },
    });
  }
}
