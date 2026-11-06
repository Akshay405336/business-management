import { Inject, Injectable } from '@nestjs/common';
import { DeleteLeadHandler } from '../delete/delete-lead.handler.js';
import { LeadBulkActionRunner } from '../bulk-operations/lead-bulk-action.runner.js';
import type { BulkDeleteLeadsCommand } from './bulk-delete-leads.command.js';
import type { BulkDeleteLeadsResult } from './bulk-delete-leads.result.js';

@Injectable()
export class BulkDeleteLeadsHandler {
  constructor(
    @Inject(LeadBulkActionRunner) private readonly bulkRunner: LeadBulkActionRunner,
    @Inject(DeleteLeadHandler) private readonly deleteLead: DeleteLeadHandler,
  ) {}

  async execute(command: BulkDeleteLeadsCommand): Promise<BulkDeleteLeadsResult> {
    const { actor, leadIds } = command;
    return this.bulkRunner.run(leadIds, async (leadId) => {
      await this.deleteLead.execute({ actor, leadId });
    });
  }
}
