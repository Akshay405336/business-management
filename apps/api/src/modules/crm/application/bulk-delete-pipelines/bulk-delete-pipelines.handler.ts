import { Inject, Injectable } from '@nestjs/common';
import { DeletePipelineHandler } from '../delete-pipeline/delete-pipeline.handler.js';
import { PipelineBulkActionRunner } from '../pipeline-bulk/pipeline-bulk-action.runner.js';
import type { BulkDeletePipelinesCommand } from './bulk-delete-pipelines.command.js';
import type { BulkDeletePipelinesResult } from './bulk-delete-pipelines.result.js';

@Injectable()
export class BulkDeletePipelinesHandler {
  constructor(
    @Inject(PipelineBulkActionRunner) private readonly bulkRunner: PipelineBulkActionRunner,
    @Inject(DeletePipelineHandler) private readonly deletePipeline: DeletePipelineHandler,
  ) {}

  async execute(command: BulkDeletePipelinesCommand): Promise<BulkDeletePipelinesResult> {
    const { actor, pipelineIds } = command;
    return this.bulkRunner.run(pipelineIds, async (pipelineId) => {
      await this.deletePipeline.execute({ actor, pipelineId });
    });
  }
}
