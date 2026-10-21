import { normalizeMoneyInput } from './money.js';

export type PackageDiscountType = 'FIXED' | 'PERCENT';

export interface ServicePackageAddOnInput {
  readonly price: string | number;
  readonly active?: boolean;
  readonly taxExempt?: boolean;
  readonly gstRatePercent?: string | number | null;
}

export interface ServicePackagePricingInput {
  readonly basePrice: string | number;
  readonly addOns: readonly ServicePackageAddOnInput[];
  readonly discountType: PackageDiscountType | null | undefined;
  readonly discountValue: string | number;
  /** GST percentage (18 = 18%), not a decimal fraction. Empty/null is treated as 0%. */
  readonly gstRatePercent?: string | number | null;
}

export interface ServicePackagePricingTotals {
  readonly taxableAmount: string;
  readonly gstAmount: string;
  readonly finalPrice: string;
  readonly discountAmount: string;
}

const toMinor = (value: string | number): bigint => {
  const raw = typeof value === 'number' ? String(value) : value;
  const parsed = normalizeMoneyInput(raw);
  const normalized = parsed.success ? parsed.value : '0';
  const [wholePart, frac = ''] = normalized.split('.');
  const whole = wholePart ?? '0';
  const cents = frac.padEnd(2, '0').slice(0, 2);
  return BigInt(whole) * 100n + BigInt(cents || '0');
};

const fromMinor = (minor: bigint): string => {
  const negative = minor < 0n;
  const abs = negative ? -minor : minor;
  const whole = abs / 100n;
  const cents = (abs % 100n).toString().padStart(2, '0');
  return `${negative ? '-' : ''}${whole}.${cents}`;
};

const roundHalfUpDiv = (numerator: bigint, denominator: bigint): bigint => {
  if (denominator === 0n) return 0n;
  const negative = numerator * denominator < 0n;
  const n = numerator < 0n ? -numerator : numerator;
  const d = denominator < 0n ? -denominator : denominator;
  const quotient = (n + d / 2n) / d;
  return negative ? -quotient : quotient;
};

/** Percentage with up to 2 decimal places → scale 100 (18.5 → 1850). */
const percentToScaled = (value: string | number): bigint => {
  const raw = typeof value === 'number' ? String(value) : value.trim();
  if (raw === '') return 0n;
  const match = /^(-?\d+)(?:\.(\d{1,2}))?$/.exec(raw);
  if (!match) return 0n;
  const whole = match[1] ?? '0';
  const frac = (match[2] ?? '').padEnd(2, '0').slice(0, 2);
  return BigInt(whole) * 100n + BigInt(frac);
};

const minMinor = (a: bigint, b: bigint): bigint => (a < b ? a : b);
const maxMinor = (a: bigint, b: bigint): bigint => (a > b ? a : b);

/** Accept legacy decimal fractions (0.18) or percent (18). */
export const normalizeGstRatePercent = (value: string | number): string => {
  const raw = typeof value === 'number' ? String(value) : value.trim();
  if (raw === '') return '0';
  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) return '0';
  if (numeric > 0 && numeric <= 1) {
    return (numeric * 100).toFixed(2).replace(/\.?0+$/, '');
  }
  return raw;
};

export const computeServicePackagePricing = (
  input: ServicePackagePricingInput,
): ServicePackagePricingTotals => {
  const baseMinor = toMinor(input.basePrice);
  const packageGstScaled = percentToScaled(
    normalizeGstRatePercent(input.gstRatePercent ?? 0),
  );

  const discountValueMinor = toMinor(input.discountValue);
  let discountMinor = 0n;
  if (input.discountType === 'FIXED') {
    discountMinor = minMinor(discountValueMinor, baseMinor);
  } else if (input.discountType === 'PERCENT') {
    discountMinor = roundHalfUpDiv(baseMinor * discountValueMinor, 10000n);
    discountMinor = minMinor(discountMinor, baseMinor);
  }

  const packageTaxableMinor = maxMinor(baseMinor - discountMinor, 0n);
  let taxableAddOnMinor = 0n;
  let exemptAddOnMinor = 0n;
  let gstMinor = roundHalfUpDiv(packageTaxableMinor * packageGstScaled, 10000n);

  for (const addOn of input.addOns) {
    if (addOn.active === false) continue;
    const priceMinor = toMinor(addOn.price);
    if (addOn.taxExempt) {
      exemptAddOnMinor += priceMinor;
      continue;
    }
    taxableAddOnMinor += priceMinor;
    const rateScaled = percentToScaled(
      normalizeGstRatePercent(addOn.gstRatePercent ?? input.gstRatePercent ?? 0),
    );
    gstMinor += roundHalfUpDiv(priceMinor * rateScaled, 10000n);
  }

  const taxableMinor = packageTaxableMinor + taxableAddOnMinor;
  const finalMinor = taxableMinor + gstMinor + exemptAddOnMinor;

  return {
    taxableAmount: fromMinor(taxableMinor),
    gstAmount: fromMinor(gstMinor),
    finalPrice: fromMinor(finalMinor),
    discountAmount: fromMinor(discountMinor),
  };
};
