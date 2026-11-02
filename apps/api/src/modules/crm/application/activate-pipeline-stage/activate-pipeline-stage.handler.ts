import { Inject, Injectable } from '@nestjs/common';
import {
  CRM_REPOSITORY,
  type CrmRepository,
  type PipelineStageRecord,
} from '../../domain/repositories/crm.repository.js';
import type { ActivatePipelineStageCommand } from './activate-pipeline-stage.command.js';

@Injectable()
export class ActivatePipelineStageHandler {
  constructor(@Inject(CRM_REPOSITORY) private readonly crm: CrmRepository) {}

  execute(command: ActivatePipelineStageCommand): Promise<PipelineStageRecord> {
    const { actor, pipelineId, stageId } = command;
    return this.crm.activateStage(actor.organizationId, pipelineId, stageId, {
      type: 'STAGE_UPDATED',
      adminId: actor.adminId,
      entityType: 'pipeline_stage',
      entityId: stageId,
      metadata: { action: 'activate' },
    });
  }
}
