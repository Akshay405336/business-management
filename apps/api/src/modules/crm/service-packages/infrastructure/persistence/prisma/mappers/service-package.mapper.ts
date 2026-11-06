import { normalizeGstRatePercent } from '@techwin/validation';
import type { Decimal } from '@prisma/client/runtime/client';
import type { ServicePackageReadModel } from '../../../../domain/types/service-package-read-model.js';
import { decimalToString } from '../../../../../infrastructure/services/proposal-money.js';

export type ServicePackagePrismaRow = {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  categories: unknown;
  shortDescription: string;
  detailedDescription: string;
  status: ServicePackageReadModel['status'];
  technologyStack: unknown;
  includedPages: unknown;
  integrations: unknown;
  adminPanelFeatures: unknown;
  hostingDeployment: unknown;
  deliveryServices: unknown;
  integrationNotes: string;
  pageCount: number | null;
  basePrice: Decimal;
  addOns: unknown;
  discountType: 'FIXED' | 'PERCENT' | null;
  discountValue: Decimal;
  gstRate: Decimal;
  taxableAmount: Decimal;
  gstAmount: Decimal;
  finalPrice: Decimal;
  deliveryDurationValue: number | null;
  deliveryDurationUnit: ServicePackageReadModel['deliveryDurationUnit'];
  supportPeriod: string;
  revisionAllowance: string;
  termsExclusions: string;
  createdByAdminId: string;
  createdAt: Date;
  updatedAt: Date;
};

export const ServicePackageMapper = {
  toReadModel(row: ServicePackagePrismaRow): ServicePackageReadModel {
    return {
      ...row,
      discountType: row.discountType ?? 'FIXED',
      basePrice: decimalToString(row.basePrice),
      discountValue: decimalToString(row.discountValue),
      gstRate: normalizeGstRatePercent(row.gstRate.toFixed(4)),
      taxableAmount: decimalToString(row.taxableAmount),
      gstAmount: decimalToString(row.gstAmount),
      finalPrice: decimalToString(row.finalPrice),
    };
  },
};
