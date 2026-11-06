import {
  computeQuotationLinePricing,
  computeQuotationSummaryTotals,
  normalizeQuotationTaxRateFraction,
} from '@techwin/validation';
import type {
  QuotationLineItemWriteInput,
  QuotationPersistLineItem,
  QuotationPersistTotals,
} from '../types/quotation.types.js';

export class QuotationPricingService {
  static computePersistLine(
    item: QuotationLineItemWriteInput,
    quotationId: string,
    sortIndex: number,
  ): QuotationPersistLineItem {
    const taxFraction = normalizeQuotationTaxRateFraction(item.taxRate ?? 0);
    const priced = computeQuotationLinePricing({
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount ?? 0,
      taxRate: taxFraction,
    });

    return {
      id: item.id ?? crypto.randomUUID(),
      quotationId,
      name: item.name,
      category: item.category ?? '',
      sourcePackageId: item.sourcePackageId ?? null,
      description: item.description ?? '',
      quantity: normalizeQuantity(item.quantity),
      unit: item.unit ?? 'item',
      unitPrice: roundMoney(item.unitPrice),
      discount: priced.discount,
      taxRate: taxFraction.toFixed(4),
      lineTotal: priced.lineTotal,
      sortOrder: item.sortOrder ?? sortIndex,
    };
  }

  static materializeLineItems(
    quotationId: string,
    items: readonly QuotationLineItemWriteInput[],
  ): { lineItems: QuotationPersistLineItem[]; totals: QuotationPersistTotals } {
    const lineItems = items.map((item, index) =>
      this.computePersistLine(item, quotationId, index),
    );
    const totals = computeQuotationSummaryTotals(
      items.map((item) => ({
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount ?? 0,
        taxRate: normalizeQuotationTaxRateFraction(item.taxRate ?? 0),
      })),
    );
    return {
      lineItems,
      totals: {
        subtotal: totals.subtotal,
        discountTotal: totals.discountTotal,
        taxTotal: totals.taxTotal,
        grandTotal: totals.grandTotal,
      },
    };
  }
}

const roundMoney = (value: string | number): string => {
  const n = typeof value === 'number' ? value : Number(String(value).trim() || '0');
  if (!Number.isFinite(n)) return '0.00';
  return n.toFixed(2);
};

const normalizeQuantity = (value: string | number): string => {
  const n = typeof value === 'number' ? value : Number(String(value).trim() || '0');
  if (!Number.isFinite(n)) return '0.0000';
  return n.toFixed(4);
};
