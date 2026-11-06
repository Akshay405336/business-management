import { Inject, Injectable } from '@nestjs/common';
import {
  QUOTATION_REPOSITORY,
  type QuotationRepository,
} from '../../domain/repositories/quotation.repository.js';
import type { PreviewDocumentNumberQuery } from './preview-document-number.query.js';

@Injectable()
export class PreviewDocumentNumberHandler {
  constructor(@Inject(QUOTATION_REPOSITORY) private readonly quotations: QuotationRepository) {}

  execute(query: PreviewDocumentNumberQuery): Promise<string> {
    const { actor, type } = query;
    return this.quotations.previewDocumentNumber(actor.organizationId, type);
  }
}
