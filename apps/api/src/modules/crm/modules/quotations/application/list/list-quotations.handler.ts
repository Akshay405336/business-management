import { Inject, Injectable } from '@nestjs/common';
import {
  QUOTATION_REPOSITORY,
  type QuotationRepository,
} from '../../domain/repositories/quotation.repository.js';
import type { PaginatedQuotations } from '../../domain/types/quotation-read-model.js';
import { QuotationExpiryReconciliation } from '../shared/quotation-expiry-reconciliation.js';
import type { ListQuotationsQuery } from './list-quotations.query.js';

@Injectable()
export class ListQuotationsHandler {
  constructor(
    @Inject(QUOTATION_REPOSITORY) private readonly quotations: QuotationRepository,
    @Inject(QuotationExpiryReconciliation)
    private readonly expiryReconciliation: QuotationExpiryReconciliation,
  ) {}

  async execute(query: ListQuotationsQuery): Promise<PaginatedQuotations> {
    const { actor, filters } = query;
    await this.expiryReconciliation.reconcileOrganization(actor.organizationId);
    return this.quotations.list(actor.organizationId, filters);
  }
}
