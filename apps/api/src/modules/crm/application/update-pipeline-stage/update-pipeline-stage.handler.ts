import { Inject, Injectable } from '@nestjs/common';
import {
  CRM_REPOSITORY,
  type CrmRepository,
  type PipelineStageRecord,
} from '../../domain/repositories/crm.repository.js';
import type { UpdatePipelineStageCommand } from './update-pipeline-stage.command.js';

@Injectable()
export class UpdatePipelineStageHandler {
  constructor(@Inject(CRM_REPOSITORY) private readonly crm: CrmRepository) {}

  execute(command: UpdatePipelineStageCommand): Promise<PipelineStageRecord> {
    const { actor, pipelineId, stageId, input } = command;
    return this.crm.updateStage(actor.organizationId, pipelineId, stageId, input, {
      type: 'STAGE_UPDATED',
      adminId: actor.adminId,
      entityType: 'pipeline_stage',
      entityId: stageId,
    });
  }
}
