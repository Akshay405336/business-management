import { QuotationValidationError } from '../errors/quotation.errors.js';

export class QuotationTitle {
  private constructor(readonly value: string) {}

  static create(raw: string): QuotationTitle {
    const value = raw.trim();
    if (!value) {
      throw new QuotationValidationError('Quotation title is required.');
    }
    if (value.length > 200) {
      throw new QuotationValidationError('Quotation title must be at most 200 characters.');
    }
    return new QuotationTitle(value);
  }
}
