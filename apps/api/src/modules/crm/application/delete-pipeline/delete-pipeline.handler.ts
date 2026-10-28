import { Inject, Injectable } from '@nestjs/common';
import { CrmNotFoundError, CrmValidationError } from '../../domain/errors/crm.errors.js';
import {
  CRM_REPOSITORY,
  type CrmRepository,
} from '../../domain/repositories/crm.repository.js';
import type { DeletePipelineCommand } from './delete-pipeline.command.js';
import type { DeletePipelineResult } from './delete-pipeline.result.js';

@Injectable()
export class DeletePipelineHandler {
  constructor(@Inject(CRM_REPOSITORY) private readonly crm: CrmRepository) {}

  async execute(command: DeletePipelineCommand): Promise<DeletePipelineResult> {
    const { actor, pipelineId } = command;
    const pipeline = await this.crm.getPipeline(actor.organizationId, pipelineId);
    if (!pipeline) throw new CrmNotFoundError('Pipeline');
    if (pipeline.isDefault) {
      throw new CrmValidationError('The default pipeline cannot be deleted.');
    }
    await this.crm.deletePipeline(actor.organizationId, pipelineId, {
      type: 'PIPELINE_DELETED',
      adminId: actor.adminId,
      entityType: 'pipeline',
      entityId: pipelineId,
    });
    return { pipelineId };
  }
}
