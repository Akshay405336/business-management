import { Inject, Injectable } from '@nestjs/common';
import {
  CRM_REPOSITORY,
  type CrmRepository,
  type ProposalRecord,
} from '../../domain/repositories/crm.repository.js';
import type { UpdateProposalCommand } from './update-proposal.command.js';

@Injectable()
export class UpdateProposalHandler {
  constructor(@Inject(CRM_REPOSITORY) private readonly crm: CrmRepository) {}

  execute(command: UpdateProposalCommand): Promise<ProposalRecord> {
    const { actor, proposalId, input } = command;
    return this.crm.updateProposal(actor.organizationId, proposalId, input, {
      type: 'PROPOSAL_UPDATED',
      adminId: actor.adminId,
      entityType: 'proposal',
      entityId: proposalId,
    });
  }
}
