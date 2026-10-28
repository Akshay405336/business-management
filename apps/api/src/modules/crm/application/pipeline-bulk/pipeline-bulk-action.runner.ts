import { Injectable } from '@nestjs/common';
import type { PipelineBulkActionResult } from './pipeline-bulk-action.result.js';

@Injectable()
export class PipelineBulkActionRunner {
  async run(
    pipelineIds: readonly string[],
    action: (pipelineId: string) => Promise<void>,
  ): Promise<PipelineBulkActionResult> {
    const succeededIds: string[] = [];
    const failures: { pipelineId: string; message: string }[] = [];
    const uniqueIds = [...new Set(pipelineIds)];
    for (const pipelineId of uniqueIds) {
      try {
        await action(pipelineId);
        succeededIds.push(pipelineId);
      } catch (error) {
        failures.push({
          pipelineId,
          message: error instanceof Error ? error.message : 'Request failed.',
        });
      }
    }
    return { succeededIds, failures };
  }
}
