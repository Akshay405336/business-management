import { Inject, Injectable } from '@nestjs/common';
import {
  CRM_REPOSITORY,
  type CrmRepository,
} from '../../domain/repositories/crm.repository.js';
import type { GetProposalPrintDataQuery } from './get-proposal-print-data.query.js';

@Injectable()
export class GetProposalPrintDataHandler {
  constructor(@Inject(CRM_REPOSITORY) private readonly crm: CrmRepository) {}

  execute(query: GetProposalPrintDataQuery) {
    const { actor, proposalId } = query;
    return this.crm.getProposalPrintData(actor.organizationId, proposalId);
  }
}
