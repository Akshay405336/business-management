import { Decimal } from '@prisma/client/runtime/client';
import { QuotationPricingService } from '../../quotations/domain/services/quotation-pricing.service.js';
import type { QuotationLineItemWriteInput } from '../../quotations/domain/types/quotation.types.js';

const MONEY_SCALE = 2;

export interface QuotationLineItemInput {
  readonly quantity: Decimal | string | number;
  readonly unitPrice: Decimal | string | number;
  readonly discount: Decimal | string | number;
  readonly taxRate: Decimal | string | number;
}

export interface QuotationLineItemTotals {
  readonly quantity: Decimal;
  readonly unitPrice: Decimal;
  readonly discount: Decimal;
  readonly taxRate: Decimal;
  readonly lineTotal: Decimal;
}

export const computeLineItemTotals = (input: QuotationLineItemInput): QuotationLineItemTotals => {
  const line = QuotationPricingService.computePersistLine(
    {
      name: '_',
      quantity: decimalLikeToString(input.quantity),
      unitPrice: decimalLikeToString(input.unitPrice),
      discount: decimalLikeToString(input.discount),
      taxRate: decimalLikeToString(input.taxRate),
    } satisfies QuotationLineItemWriteInput,
    '00000000-0000-0000-0000-000000000000',
    0,
  );
  return {
    quantity: new Decimal(line.quantity),
    unitPrice: new Decimal(line.unitPrice),
    discount: new Decimal(line.discount),
    taxRate: new Decimal(line.taxRate),
    lineTotal: new Decimal(line.lineTotal),
  };
};

export interface QuotationTotals {
  readonly subtotal: Decimal;
  readonly discountTotal: Decimal;
  readonly taxTotal: Decimal;
  readonly grandTotal: Decimal;
}

export const computeQuotationTotals = (
  lines: readonly Pick<
    QuotationLineItemTotals,
    'quantity' | 'unitPrice' | 'discount' | 'lineTotal' | 'taxRate'
  >[],
): QuotationTotals => {
  const items: QuotationLineItemWriteInput[] = lines.map((line) => ({
    name: '_',
    quantity: line.quantity.toString(),
    unitPrice: line.unitPrice.toString(),
    discount: line.discount.toString(),
    taxRate: line.taxRate.toString(),
  }));
  const { totals } = QuotationPricingService.materializeLineItems(
    '00000000-0000-0000-0000-000000000000',
    items,
  );
  return {
    subtotal: new Decimal(totals.subtotal),
    discountTotal: new Decimal(totals.discountTotal),
    taxTotal: new Decimal(totals.taxTotal),
    grandTotal: new Decimal(totals.grandTotal),
  };
};

export const decimalToString = (value: Decimal): string => value.toFixed(MONEY_SCALE);

const decimalLikeToString = (value: Decimal | string | number): string =>
  value instanceof Decimal ? value.toString() : String(value);
