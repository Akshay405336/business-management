import { Decimal } from '@prisma/client/runtime/client';

const MONEY_SCALE = 2;
const QUANTITY_SCALE = 4;
const TAX_RATE_SCALE = 4;

const toMoney = (value: Decimal | string | number): Decimal =>
  new Decimal(value).toDecimalPlaces(MONEY_SCALE, Decimal.ROUND_HALF_UP);

const toQuantity = (value: Decimal | string | number): Decimal =>
  new Decimal(value).toDecimalPlaces(QUANTITY_SCALE, Decimal.ROUND_HALF_UP);

const toTaxRate = (value: Decimal | string | number): Decimal =>
  new Decimal(value).toDecimalPlaces(TAX_RATE_SCALE, Decimal.ROUND_HALF_UP);

export interface ProposalLineItemInput {
  readonly quantity: Decimal | string | number;
  readonly unitPrice: Decimal | string | number;
  readonly discount: Decimal | string | number;
  readonly taxRate: Decimal | string | number;
}

export interface ProposalLineItemTotals {
  readonly quantity: Decimal;
  readonly unitPrice: Decimal;
  readonly discount: Decimal;
  readonly taxRate: Decimal;
  readonly lineTotal: Decimal;
}

export const computeLineItemTotals = (input: ProposalLineItemInput): ProposalLineItemTotals => {
  const quantity = toQuantity(input.quantity);
  const unitPrice = toMoney(input.unitPrice);
  const discount = toMoney(input.discount);
  const taxRate = toTaxRate(input.taxRate);

  const gross = quantity.mul(unitPrice);
  const net = Decimal.max(gross.sub(discount), new Decimal(0));
  const lineTotal = toMoney(net.mul(new Decimal(1).add(taxRate)));

  return { quantity, unitPrice, discount, taxRate, lineTotal };
};

export interface ProposalTotals {
  readonly subtotal: Decimal;
  readonly discountTotal: Decimal;
  readonly taxTotal: Decimal;
  readonly grandTotal: Decimal;
}

export const computeProposalTotals = (
  lines: readonly Pick<
    ProposalLineItemTotals,
    'quantity' | 'unitPrice' | 'discount' | 'lineTotal' | 'taxRate'
  >[],
): ProposalTotals => {
  let subtotal = new Decimal(0);
  let discountTotal = new Decimal(0);
  let taxTotal = new Decimal(0);

  for (const line of lines) {
    const gross = line.quantity.mul(line.unitPrice);
    subtotal = subtotal.add(gross);
    discountTotal = discountTotal.add(line.discount);
    const net = Decimal.max(gross.sub(line.discount), new Decimal(0));
    taxTotal = taxTotal.add(toMoney(net.mul(line.taxRate)));
  }

  const grandTotal = toMoney(subtotal.sub(discountTotal).add(taxTotal));
  return {
    subtotal: toMoney(subtotal),
    discountTotal: toMoney(discountTotal),
    taxTotal: toMoney(taxTotal),
    grandTotal,
  };
};

export const decimalToString = (value: Decimal): string => value.toFixed(MONEY_SCALE);
