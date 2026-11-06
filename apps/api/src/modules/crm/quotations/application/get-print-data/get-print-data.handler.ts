import { Inject, Injectable } from '@nestjs/common';
import {
  QUOTATION_REPOSITORY,
  type QuotationRepository,
} from '../../domain/repositories/quotation.repository.js';
import type { QuotationPrintReadModel } from '../../domain/types/quotation-read-model.js';
import type { GetPrintDataQuery } from './get-print-data.query.js';

@Injectable()
export class GetPrintDataHandler {
  constructor(@Inject(QUOTATION_REPOSITORY) private readonly quotations: QuotationRepository) {}

  execute(query: GetPrintDataQuery): Promise<QuotationPrintReadModel> {
    const { actor, quotationId } = query;
    return this.quotations.getPrintData(actor.organizationId, quotationId);
  }
}
