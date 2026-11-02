import { Inject, Injectable } from '@nestjs/common';
import {
  CRM_REPOSITORY,
  type CrmRepository,
} from '../../domain/repositories/crm.repository.js';
import type { DeleteProposalCommand } from './delete-proposal.command.js';

@Injectable()
export class DeleteProposalHandler {
  constructor(@Inject(CRM_REPOSITORY) private readonly crm: CrmRepository) {}

  execute(command: DeleteProposalCommand): Promise<void> {
    const { actor, proposalId } = command;
    return this.crm.deleteProposal(actor.organizationId, proposalId, {
      type: 'PROPOSAL_UPDATED',
      adminId: actor.adminId,
      entityType: 'proposal',
      entityId: proposalId,
    });
  }
}
