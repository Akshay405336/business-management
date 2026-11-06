import { Inject, Injectable } from '@nestjs/common';
import {
  QUOTATION_REPOSITORY,
  type QuotationRepository,
} from '../../domain/repositories/quotation.repository.js';
import type { QuotationReadModel } from '../../domain/types/quotation-read-model.js';
import { QuotationExpiryReconciliation } from '../shared/quotation-expiry-reconciliation.js';
import { requireQuotation } from '../shared/require-quotation.js';
import type { GetQuotationQuery } from './get-quotation.query.js';

@Injectable()
export class GetQuotationHandler {
  constructor(
    @Inject(QUOTATION_REPOSITORY) private readonly quotations: QuotationRepository,
    @Inject(QuotationExpiryReconciliation)
    private readonly expiryReconciliation: QuotationExpiryReconciliation,
  ) {}

  async execute(query: GetQuotationQuery): Promise<QuotationReadModel> {
    const { actor, quotationId } = query;
    await this.expiryReconciliation.reconcileOrganization(actor.organizationId);
    return requireQuotation(this.quotations.findById(actor.organizationId, quotationId));
  }
}
