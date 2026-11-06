import { formatQuotationDocumentNumber } from '@techwin/validation';
import type { QuotationDocumentType } from '../enums/quotation-status.enum.js';

/** Formats the next document number from a sequence value (persistence assigns the sequence). */
export class QuotationNumber {
  private constructor(readonly value: string) {}

  static format(type: QuotationDocumentType, sequenceNumber: number): QuotationNumber {
    return new QuotationNumber(formatQuotationDocumentNumber(type, sequenceNumber));
  }

  static previewNext(type: QuotationDocumentType, lastSequenceValue: number): QuotationNumber {
    const next = lastSequenceValue + 1;
    return QuotationNumber.format(type, next);
  }
}
