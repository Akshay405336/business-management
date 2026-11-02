import { Inject, Injectable } from '@nestjs/common';
import {
  CRM_REPOSITORY,
  type CrmRepository,
  type PipelineRecord,
} from '../../domain/repositories/crm.repository.js';
import type { CreatePipelineCommand } from './create-pipeline.command.js';

@Injectable()
export class CreatePipelineHandler {
  constructor(@Inject(CRM_REPOSITORY) private readonly crm: CrmRepository) {}

  execute(command: CreatePipelineCommand): Promise<PipelineRecord> {
    const { actor, input } = command;
    return this.crm.createPipeline(actor.organizationId, input, {
      type: 'PIPELINE_CREATED',
      adminId: actor.adminId,
      entityType: 'pipeline',
      entityId: crypto.randomUUID(),
      metadata: { name: input.name },
    });
  }
}
