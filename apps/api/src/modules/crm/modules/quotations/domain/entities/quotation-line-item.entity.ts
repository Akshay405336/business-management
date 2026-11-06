import { QuotationPricingService } from '../services/quotation-pricing.service.js';
import type { QuotationLineItemWriteInput, QuotationPersistLineItem } from '../types/quotation.types.js';

export class QuotationLineItem {
  private constructor(private readonly props: QuotationPersistLineItem) {}

  static materialize(
    quotationId: string,
    input: QuotationLineItemWriteInput,
    sortIndex: number,
  ): QuotationLineItem {
    return new QuotationLineItem(
      QuotationPricingService.computePersistLine(input, quotationId, sortIndex),
    );
  }

  static materializeAll(
    quotationId: string,
    inputs: readonly QuotationLineItemWriteInput[],
  ): readonly QuotationLineItem[] {
    return inputs.map((input, index) => QuotationLineItem.materialize(quotationId, input, index));
  }

  toPersist(): QuotationPersistLineItem {
    return { ...this.props };
  }
}
