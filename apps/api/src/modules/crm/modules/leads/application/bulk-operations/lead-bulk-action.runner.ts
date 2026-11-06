import { Injectable } from '@nestjs/common';
import type { LeadBulkActionResult } from './lead-bulk-action.result.js';

@Injectable()
export class LeadBulkActionRunner {
  async run(
    leadIds: readonly string[],
    action: (leadId: string) => Promise<void>,
  ): Promise<LeadBulkActionResult> {
    const succeededIds: string[] = [];
    const failures: { leadId: string; message: string }[] = [];
    const uniqueIds = [...new Set(leadIds)];
    for (const leadId of uniqueIds) {
      try {
        await action(leadId);
        succeededIds.push(leadId);
      } catch (error) {
        failures.push({
          leadId,
          message: error instanceof Error ? error.message : 'Request failed.',
        });
      }
    }
    return { succeededIds, failures };
  }
}
