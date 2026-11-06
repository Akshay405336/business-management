import { QuotationValidationError } from '../errors/quotation.errors.js';
import type { QuotationStatus } from '../enums/quotation-status.enum.js';
import type { UpdateQuotationData } from '../types/quotation.types.js';
import { QuotationTitle } from '../value-objects/quotation-title.vo.js';

export class QuotationUpdatePolicy {
  static assertEditable(status: QuotationStatus): void {
    if (status !== 'DRAFT') {
      throw new QuotationValidationError('Only draft quotations can be edited.');
    }
  }

  static validatePatch(input: UpdateQuotationData): UpdateQuotationData {
    if (input.title !== undefined) {
      QuotationTitle.create(input.title);
    }
    return {
      ...input,
      ...(input.clientEmail !== undefined
        ? { clientEmail: input.clientEmail.trim().toLowerCase() }
        : {}),
      ...(input.clientGstin !== undefined
        ? { clientGstin: input.clientGstin.trim().toUpperCase() }
        : {}),
    };
  }
}
