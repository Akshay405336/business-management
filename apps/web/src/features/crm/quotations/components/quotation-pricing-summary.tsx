import { computeQuotationSummaryTotals } from '@techwin/validation';
import { formatMoney } from '@/features/admin/crm/utils/format';
import type { QuotationLineItemForm } from '../utils/quotation-form';

type QuotationPricingSummaryProps = {
  readonly lineItems: readonly QuotationLineItemForm[];
  readonly currency?: string;
};

export function QuotationPricingSummary({
  lineItems,
  currency = 'INR',
}: QuotationPricingSummaryProps) {
  const pricingPreview = computeQuotationSummaryTotals(
    lineItems
      .filter((item) => item.name.trim())
      .map((item) => ({
        quantity: item.quantity || '1',
        unitPrice: item.unitPrice || '0',
        discount: item.discount || '0',
        taxRate: item.taxRatePercent.trim() ? item.taxRatePercent : '0',
      })),
  );

  return (
    <div className="bg-muted/40 grid gap-1 rounded-md border p-3 text-sm">
      <p className="font-medium">Pricing preview ({currency})</p>
      <div className="text-muted-foreground grid gap-1 tabular-nums min-[700px]:grid-cols-2">
        <span>Subtotal: {formatMoney(pricingPreview.subtotal, currency)}</span>
        <span>Discount: {formatMoney(pricingPreview.discountTotal, currency)}</span>
        <span>GST: {formatMoney(pricingPreview.taxTotal, currency)}</span>
        <span className="text-foreground min-[700px]:col-span-2 font-medium">
          Grand total: {formatMoney(pricingPreview.grandTotal, currency)}
        </span>
      </div>
    </div>
  );
}
