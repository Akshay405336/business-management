import { Inject, Injectable } from '@nestjs/common';
import { PipelineBulkActionRunner } from '../pipeline-bulk/pipeline-bulk-action.runner.js';
import { UpdatePipelineStatusHandler } from '../update-pipeline-status/update-pipeline-status.handler.js';
import type { BulkUpdatePipelineStatusCommand } from './bulk-update-pipeline-status.command.js';
import type { BulkUpdatePipelineStatusResult } from './bulk-update-pipeline-status.result.js';

@Injectable()
export class BulkUpdatePipelineStatusHandler {
  constructor(
    @Inject(PipelineBulkActionRunner) private readonly bulkRunner: PipelineBulkActionRunner,
    @Inject(UpdatePipelineStatusHandler)
    private readonly updateStatus: UpdatePipelineStatusHandler,
  ) {}

  async execute(
    command: BulkUpdatePipelineStatusCommand,
  ): Promise<BulkUpdatePipelineStatusResult> {
    const { actor, pipelineIds, status } = command;
    return this.bulkRunner.run(pipelineIds, async (pipelineId) => {
      await this.updateStatus.execute({ actor, pipelineId, status });
    });
  }
}
