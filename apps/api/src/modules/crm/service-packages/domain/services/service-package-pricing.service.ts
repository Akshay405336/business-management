import {
  computeServicePackagePricing,
  normalizeGstRatePercent,
  type ServicePackagePricingInput,
  type ServicePackagePricingTotals,
} from '@techwin/validation';
import type { ServicePackageWriteInput } from '../types/service-package.types.js';

type AddOnRow = {
  price?: string | number;
  active?: boolean;
  taxExempt?: boolean;
  gstRatePercent?: string | number | null;
};

const parseAddOns = (value: unknown): AddOnRow[] =>
  Array.isArray(value) ? (value as AddOnRow[]) : [];

export class ServicePackagePricingService {
  static compute(input: ServicePackagePricingInput): ServicePackagePricingTotals {
    return computeServicePackagePricing(input);
  }

  static computeFromWriteInput(input: ServicePackageWriteInput): ServicePackagePricingTotals {
    const addOns = parseAddOns(input.addOns).map((item) => ({
      price: item.price ?? 0,
      active: item.active,
      taxExempt: item.taxExempt,
      gstRatePercent: item.gstRatePercent,
    }));
    return computeServicePackagePricing({
      basePrice: input.basePrice ?? 0,
      addOns,
      discountType: input.discountType ?? 'FIXED',
      discountValue: input.discountValue ?? 0,
      gstRatePercent: normalizeGstRatePercent(input.gstRate ?? 0),
    });
  }
}
