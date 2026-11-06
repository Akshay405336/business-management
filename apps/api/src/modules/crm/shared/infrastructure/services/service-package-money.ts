import { Decimal } from '@prisma/client/runtime/client';
import {
  computeServicePackagePricing as computeShared,
  type ServicePackagePricingInput as SharedServicePackagePricingInput,
} from '@techwin/validation';

export type ServicePackageAddOnInput = SharedServicePackagePricingInput['addOns'][number];
export type ServicePackagePricingInput = SharedServicePackagePricingInput;

export interface ServicePackagePricingTotals {
  readonly taxableAmount: Decimal;
  readonly gstAmount: Decimal;
  readonly finalPrice: Decimal;
  readonly discountAmount: Decimal;
}

export const computeServicePackagePricing = (
  input: ServicePackagePricingInput,
): ServicePackagePricingTotals => {
  const totals = computeShared(input);
  return {
    taxableAmount: new Decimal(totals.taxableAmount),
    gstAmount: new Decimal(totals.gstAmount),
    finalPrice: new Decimal(totals.finalPrice),
    discountAmount: new Decimal(totals.discountAmount),
  };
};
