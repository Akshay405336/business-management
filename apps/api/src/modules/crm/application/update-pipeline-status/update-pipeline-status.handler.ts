import { Inject, Injectable } from '@nestjs/common';
import {
  CRM_REPOSITORY,
  type CrmRepository,
} from '../../domain/repositories/crm.repository.js';
import type { UpdatePipelineStatusCommand } from './update-pipeline-status.command.js';
import type { UpdatePipelineStatusResult } from './update-pipeline-status.result.js';

@Injectable()
export class UpdatePipelineStatusHandler {
  constructor(@Inject(CRM_REPOSITORY) private readonly crm: CrmRepository) {}

  async execute(command: UpdatePipelineStatusCommand): Promise<UpdatePipelineStatusResult> {
    const { actor, pipelineId, status } = command;
    await this.crm.updatePipeline(actor.organizationId, pipelineId, { status }, {
      type: 'PIPELINE_UPDATED',
      adminId: actor.adminId,
      entityType: 'pipeline',
      entityId: pipelineId,
    });
    return { pipelineId, status };
  }
}
