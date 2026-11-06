import { QuotationValidationError } from '../errors/quotation.errors.js';
import type { QuotationStatus } from '../enums/quotation-status.enum.js';

export class QuotationDeletionPolicy {
  static assertCanDelete(status: QuotationStatus): void {
    if (status !== 'DRAFT') {
      throw new QuotationValidationError('Only draft documents can be deleted.');
    }
  }
}
