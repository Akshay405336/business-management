import { Inject, Injectable } from '@nestjs/common';
import {
  CRM_REPOSITORY,
  type CrmRepository,
  type ProposalRecord,
} from '../../domain/repositories/crm.repository.js';
import type { CreateProposalCommand } from './create-proposal.command.js';

@Injectable()
export class CreateProposalHandler {
  constructor(@Inject(CRM_REPOSITORY) private readonly crm: CrmRepository) {}

  execute(command: CreateProposalCommand): Promise<ProposalRecord> {
    const { actor, input } = command;
    const proposalId = crypto.randomUUID();
    return this.crm.createProposal(
      actor.organizationId,
      { ...input, createdByAdminId: actor.adminId },
      {
        type: 'PROPOSAL_CREATED',
        adminId: actor.adminId,
        entityType: 'proposal',
        entityId: proposalId,
      },
    );
  }
}
