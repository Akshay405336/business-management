import { Inject, Injectable } from '@nestjs/common';
import {
  CRM_REPOSITORY,
  type CrmRepository,
  type PipelineRecord,
} from '../../domain/repositories/crm.repository.js';
import type { UpdatePipelineCommand } from './update-pipeline.command.js';

@Injectable()
export class UpdatePipelineHandler {
  constructor(@Inject(CRM_REPOSITORY) private readonly crm: CrmRepository) {}

  execute(command: UpdatePipelineCommand): Promise<PipelineRecord> {
    const { actor, pipelineId, input } = command;
    return this.crm.updatePipeline(actor.organizationId, pipelineId, input, {
      type: 'PIPELINE_UPDATED',
      adminId: actor.adminId,
      entityType: 'pipeline',
      entityId: pipelineId,
    });
  }
}
