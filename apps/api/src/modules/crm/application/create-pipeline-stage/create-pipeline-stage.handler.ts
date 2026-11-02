import { Inject, Injectable } from '@nestjs/common';
import {
  CRM_REPOSITORY,
  type CrmRepository,
  type PipelineStageRecord,
} from '../../domain/repositories/crm.repository.js';
import type { CreatePipelineStageCommand } from './create-pipeline-stage.command.js';

@Injectable()
export class CreatePipelineStageHandler {
  constructor(@Inject(CRM_REPOSITORY) private readonly crm: CrmRepository) {}

  execute(command: CreatePipelineStageCommand): Promise<PipelineStageRecord> {
    const { actor, pipelineId, input } = command;
    return this.crm.createStage(actor.organizationId, pipelineId, input, {
      type: 'STAGE_CREATED',
      adminId: actor.adminId,
      entityType: 'pipeline_stage',
      entityId: crypto.randomUUID(),
      metadata: { pipelineId, name: input.name },
    });
  }
}
