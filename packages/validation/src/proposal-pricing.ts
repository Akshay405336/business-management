/** Tax-exclusive line pricing — taxRate is a decimal fraction (0.18 = 18%). */

export interface ProposalLinePricingInput {
  readonly quantity: string | number;
  readonly unitPrice: string | number;
  readonly discount?: string | number;
  readonly taxRate?: string | number;
}

export interface ProposalLinePricingTotals {
  readonly grossAmount: string;
  readonly discount: string;
  readonly taxableAmount: string;
  readonly taxAmount: string;
  readonly lineTotal: string;
}

const toMoney = (value: string | number): number => {
  const n = typeof value === 'number' ? value : Number(String(value).trim() || '0');
  return Number.isFinite(n) ? n : 0;
};

const roundMoney = (value: number): string => value.toFixed(2);

/** Accept percent (18) or fraction (0.18). Values above 1 are treated as percent. */
export const normalizeProposalTaxRateFraction = (value: string | number | undefined | null): number => {
  if (value === undefined || value === null || value === '') return 0;
  const n = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isFinite(n) || n < 0) return 0;
  if (n > 1) return n / 100;
  return n;
};

export const computeProposalLinePricing = (
  input: ProposalLinePricingInput,
): ProposalLinePricingTotals => {
  const quantity = toMoney(input.quantity);
  const unitPrice = toMoney(input.unitPrice);
  const discount = toMoney(input.discount ?? 0);
  const taxRate = normalizeProposalTaxRateFraction(input.taxRate);

  const gross = quantity * unitPrice;
  const taxable = Math.max(gross - discount, 0);
  const taxAmount = taxable * taxRate;
  const lineTotal = taxable + taxAmount;

  return {
    grossAmount: roundMoney(gross),
    discount: roundMoney(discount),
    taxableAmount: roundMoney(taxable),
    taxAmount: roundMoney(taxAmount),
    lineTotal: roundMoney(lineTotal),
  };
};

export interface ProposalSummaryTotals {
  readonly subtotal: string;
  readonly discountTotal: string;
  readonly taxableAmount: string;
  readonly taxTotal: string;
  readonly grandTotal: string;
}

export const computeProposalSummaryTotals = (
  lines: readonly ProposalLinePricingInput[],
): ProposalSummaryTotals => {
  let subtotal = 0;
  let discountTotal = 0;
  let taxableAmount = 0;
  let taxTotal = 0;

  for (const line of lines) {
    const row = computeProposalLinePricing(line);
    subtotal += toMoney(row.grossAmount);
    discountTotal += toMoney(row.discount);
    taxableAmount += toMoney(row.taxableAmount);
    taxTotal += toMoney(row.taxAmount);
  }

  const grandTotal = taxableAmount + taxTotal;
  return {
    subtotal: roundMoney(subtotal),
    discountTotal: roundMoney(discountTotal),
    taxableAmount: roundMoney(taxableAmount),
    taxTotal: roundMoney(taxTotal),
    grandTotal: roundMoney(grandTotal),
  };
};

/** Display stored tax fraction as a whole-number percent string. */
export const proposalTaxRateFractionToPercentDisplay = (
  fraction: string | number,
): string => {
  const n = normalizeProposalTaxRateFraction(fraction);
  const percent = n * 100;
  if (Number.isInteger(percent)) return String(percent);
  return percent.toFixed(2).replace(/\.?0+$/, '');
};
