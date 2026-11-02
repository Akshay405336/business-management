import { Inject, Injectable } from '@nestjs/common';
import {
  CRM_REPOSITORY,
  type CrmRepository,
} from '../../domain/repositories/crm.repository.js';
import type { PreviewProposalDocumentNumberQuery } from './preview-proposal-document-number.query.js';

@Injectable()
export class PreviewProposalDocumentNumberHandler {
  constructor(@Inject(CRM_REPOSITORY) private readonly crm: CrmRepository) {}

  execute(query: PreviewProposalDocumentNumberQuery): Promise<string> {
    const { actor, type } = query;
    return this.crm.previewProposalDocumentNumber(actor.organizationId, type);
  }
}
