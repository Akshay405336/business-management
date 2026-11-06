import { normalizeGstRatePercent } from '@techwin/validation';
import { Decimal } from '@prisma/client/runtime/client';
import type { ServicePackageReadModel } from '../../domain/types/service-package-read-model.js';
import { ServicePackageValidationError } from '../../domain/errors/service-package.errors.js';
import { ServicePackagePricingService } from '../../domain/services/service-package-pricing.service.js';
import { decimalToString } from '../../../../shared/infrastructure/services/quotation-money.js';
import { QuotationPricingService } from '../../../quotations/domain/services/quotation-pricing.service.js';

type AddOnRow = {
  name?: string;
  price?: string | number;
  active?: boolean;
  taxExempt?: boolean;
  gstRatePercent?: string | number | null;
};

const parseAddOns = (value: unknown): AddOnRow[] =>
  Array.isArray(value) ? (value as AddOnRow[]) : [];

/** Application-facing contract for quotation creation and line-item materialization. */
export const ServicePackageQuotationIntegration = {
  assertActiveForQuotation(pkg: ServicePackageReadModel): void {
    if (pkg.status !== 'ACTIVE') {
      throw new ServicePackageValidationError('Service package is not active.');
    }
  },

  buildPackageSnapshot(pkg: ServicePackageReadModel): Record<string, unknown> {
    return {
      ...pkg,
      snapshotAt: new Date().toISOString(),
    };
  },

  buildQuotationLinesFromPackage(pkg: ServicePackageReadModel): {
    readonly lineItems: {
      name: string;
      description: string;
      quantity: string;
      unit: string;
      unitPrice: string;
      discount: string;
      taxRate: string;
      sortOrder: number;
      category?: string;
      sourcePackageId?: string;
    }[];
    readonly totals: ReturnType<typeof QuotationPricingService.materializeLineItems>['totals'];
  } {
    const addOns = parseAddOns(pkg.addOns);
    const pricing = ServicePackagePricingService.compute({
      basePrice: pkg.basePrice,
      addOns: addOns.map((item) => ({
        price: item.price ?? 0,
        active: item.active,
        taxExempt: item.taxExempt,
        gstRatePercent: item.gstRatePercent,
      })),
      discountType: pkg.discountType,
      discountValue: pkg.discountValue,
      gstRatePercent: pkg.gstRate,
    });
    const addOnTotal = addOns
      .filter((item) => item.active !== false)
      .reduce((sum, item) => sum.add(new Decimal(item.price ?? 0)), new Decimal(0));
    const unitPrice = new Decimal(pkg.basePrice).add(addOnTotal);
    const taxRateFraction = new Decimal(normalizeGstRatePercent(pkg.gstRate)).div(100);
    const categories = Array.isArray(pkg.categories)
      ? (pkg.categories as { label?: string }[])
      : [];
    const categoryLabel = categories
      .slice(0, 2)
      .map((item) => item.label)
      .filter(Boolean)
      .join(', ');
    const lines = [
      {
        name: pkg.name,
        category: categoryLabel,
        sourcePackageId: pkg.id,
        description: pkg.shortDescription || pkg.detailedDescription,
        quantity: '1',
        unit: 'package',
        unitPrice: decimalToString(unitPrice),
        discount: pricing.discountAmount,
        taxRate: taxRateFraction.toFixed(4),
        sortOrder: 0,
      },
    ];
    const { totals } = QuotationPricingService.materializeLineItems(
      '00000000-0000-0000-0000-000000000000',
      lines,
    );
    return {
      lineItems: lines,
      totals,
    };
  },
};
