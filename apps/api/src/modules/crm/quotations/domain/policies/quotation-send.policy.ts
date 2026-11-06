import { QuotationValidationError } from '../errors/quotation.errors.js';
import type { QuotationStatus } from '../enums/quotation-status.enum.js';
import { isQuotationPastExpiry } from '../utils/quotation-date.utils.js';

export class QuotationSendPolicy {
  static assertCanSend(input: {
    readonly status: QuotationStatus;
    readonly expiryDate: Date | null;
    readonly now?: Date;
  }): void {
    if (input.status === 'EXPIRED' || isQuotationPastExpiry(input.expiryDate, input.now)) {
      throw new QuotationValidationError('This quotation has expired and cannot be sent.');
    }
    if (input.status === 'ACCEPTED' || input.status === 'REJECTED' || input.status === 'CANCELLED') {
      throw new QuotationValidationError('This quotation cannot be sent in its current status.');
    }
    if (input.status !== 'DRAFT' && input.status !== 'SENT') {
      throw new QuotationValidationError('This quotation cannot be sent in its current status.');
    }
  }
}
