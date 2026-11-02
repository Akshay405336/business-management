import { Inject, Injectable } from '@nestjs/common';
import {
  CRM_REPOSITORY,
  type CrmRepository,
  type PipelineStageRecord,
} from '../../domain/repositories/crm.repository.js';
import type { ReorderPipelineStagesCommand } from './reorder-pipeline-stages.command.js';

@Injectable()
export class ReorderPipelineStagesHandler {
  constructor(@Inject(CRM_REPOSITORY) private readonly crm: CrmRepository) {}

  execute(command: ReorderPipelineStagesCommand): Promise<readonly PipelineStageRecord[]> {
    const { actor, pipelineId, orderedStageIds } = command;
    return this.crm.reorderStages(actor.organizationId, pipelineId, orderedStageIds, {
      type: 'STAGE_REORDERED',
      adminId: actor.adminId,
      entityType: 'pipeline',
      entityId: pipelineId,
    });
  }
}
