import { Inject, Injectable } from '@nestjs/common';
import {
  CRM_REPOSITORY,
  type CrmRepository,
} from '../../domain/repositories/crm.repository.js';
import type { DeletePipelineStageCommand } from './delete-pipeline-stage.command.js';

@Injectable()
export class DeletePipelineStageHandler {
  constructor(@Inject(CRM_REPOSITORY) private readonly crm: CrmRepository) {}

  execute(command: DeletePipelineStageCommand): Promise<void> {
    const { actor, pipelineId, stageId, targetStageId } = command;
    return this.crm.deleteStage(actor.organizationId, pipelineId, stageId, targetStageId, {
      type: 'STAGE_DELETED',
      adminId: actor.adminId,
      entityType: 'pipeline_stage',
      entityId: stageId,
    });
  }
}
