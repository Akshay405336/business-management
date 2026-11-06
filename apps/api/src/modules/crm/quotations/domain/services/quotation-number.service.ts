import type { QuotationDocumentType } from '../enums/quotation-status.enum.js';
import { QuotationNumber } from '../value-objects/quotation-number.vo.js';

export class QuotationNumberService {
  static previewDocumentNumber(
    type: QuotationDocumentType,
    lastSequenceValue: number,
  ): string {
    return QuotationNumber.previewNext(type, lastSequenceValue).value;
  }

  static formatAssignedNumber(type: QuotationDocumentType, sequenceNumber: number): string {
    return QuotationNumber.format(type, sequenceNumber).value;
  }
}
