import { Inject, Injectable } from '@nestjs/common';
import {
  QUOTATION_REPOSITORY,
  type QuotationRepository,
} from '../../domain/repositories/quotation.repository.js';
import { QuotationPdfService } from '../../infrastructure/pdf/quotation-pdf.service.js';
import { QuotationExpiryReconciliation } from '../shared/quotation-expiry-reconciliation.js';
import type { GetQuotationPdfQuery } from './get-quotation-pdf.query.js';

export interface QuotationPdfResult {
  readonly bytes: Buffer;
  readonly filename: string;
  readonly contentType: 'application/pdf';
}

@Injectable()
export class GetQuotationPdfHandler {
  constructor(
    @Inject(QUOTATION_REPOSITORY) private readonly quotations: QuotationRepository,
    @Inject(QuotationPdfService) private readonly pdf: QuotationPdfService,
    @Inject(QuotationExpiryReconciliation)
    private readonly expiryReconciliation: QuotationExpiryReconciliation,
  ) {}

  async execute(query: GetQuotationPdfQuery): Promise<QuotationPdfResult> {
    const { actor, quotationId } = query;
    await this.expiryReconciliation.reconcileOrganization(actor.organizationId);
    const print = await this.quotations.getPrintData(actor.organizationId, quotationId);
    const bytes = await this.pdf.render(print);
    return {
      bytes,
      filename: this.pdf.filename(print.documentNumber),
      contentType: 'application/pdf',
    };
  }
}
