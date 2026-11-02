import { Inject, Injectable } from '@nestjs/common';
import {
  CRM_REPOSITORY,
  type CrmRepository,
  type ProposalRecord,
} from '../../domain/repositories/crm.repository.js';
import { requireCrmEntity } from '../shared/require-crm-entity.js';
import type { GetProposalQuery } from './get-proposal.query.js';

@Injectable()
export class GetProposalHandler {
  constructor(@Inject(CRM_REPOSITORY) private readonly crm: CrmRepository) {}

  execute(query: GetProposalQuery): Promise<ProposalRecord> {
    const { actor, proposalId } = query;
    return requireCrmEntity(
      this.crm.getProposal(actor.organizationId, proposalId),
      'Proposal',
    );
  }
}
