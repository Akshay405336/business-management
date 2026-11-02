import { Inject, Injectable } from '@nestjs/common';
import {
  CRM_REPOSITORY,
  type CrmRepository,
  type ProposalRecord,
} from '../../domain/repositories/crm.repository.js';
import type { ChangeProposalStatusCommand } from './change-proposal-status.command.js';

@Injectable()
export class ChangeProposalStatusHandler {
  constructor(@Inject(CRM_REPOSITORY) private readonly crm: CrmRepository) {}

  execute(command: ChangeProposalStatusCommand): Promise<ProposalRecord> {
    const { actor, proposalId, toStatus, note = '' } = command;
    return this.crm.changeProposalStatus(
      actor.organizationId,
      proposalId,
      toStatus,
      note,
      actor.adminId,
      {
        type: 'PROPOSAL_STATUS_CHANGED',
        adminId: actor.adminId,
        entityType: 'proposal',
        entityId: proposalId,
        metadata: { toStatus },
      },
    );
  }
}
