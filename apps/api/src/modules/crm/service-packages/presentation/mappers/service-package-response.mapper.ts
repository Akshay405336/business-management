import type { CrmServicePackage, CatalogSelection } from '@techwin/contracts';
import type { ServicePackageReadModel } from '../../domain/types/service-package-read-model.js';

const iso = (value: Date): string => value.toISOString();

const asSelections = (value: unknown): CatalogSelection[] =>
  Array.isArray(value)
    ? (value as { id?: string; label?: string }[]).map((item) => ({
        id: item.id ?? item.label ?? '',
        label: item.label ?? item.id ?? '',
      }))
    : [];

const asAddOns = (value: unknown): CrmServicePackage['addOns'] =>
  Array.isArray(value)
    ? (value as { name?: string; price?: string; description?: string; gstRatePercent?: string; taxExempt?: boolean; active?: boolean }[]).map(
        (item) => ({
          id: item.name ?? '',
          name: item.name ?? '',
          price: String(item.price ?? '0'),
          ...(item.description ? { description: item.description } : {}),
          ...(item.gstRatePercent !== undefined ? { gstRatePercent: item.gstRatePercent } : {}),
          ...(item.taxExempt !== undefined ? { taxExempt: item.taxExempt } : {}),
          ...(item.active !== undefined ? { active: item.active } : {}),
        }),
      )
    : [];

export const toCrmServicePackage = (pkg: ServicePackageReadModel): CrmServicePackage => ({
  id: pkg.id,
  code: pkg.code,
  name: pkg.name,
  categories: asSelections(pkg.categories),
  shortDescription: pkg.shortDescription,
  detailedDescription: pkg.detailedDescription,
  status: pkg.status,
  technologyStack: asSelections(pkg.technologyStack),
  includedPages: asSelections(pkg.includedPages),
  integrations: asSelections(pkg.integrations),
  adminPanelFeatures: asSelections(pkg.adminPanelFeatures),
  hostingDeployment: asSelections(pkg.hostingDeployment),
  deliveryServices: asSelections(pkg.deliveryServices),
  integrationNotes: pkg.integrationNotes,
  pageCount: pkg.pageCount,
  basePrice: pkg.basePrice,
  addOns: asAddOns(pkg.addOns),
  discountType: pkg.discountType,
  discountValue: pkg.discountValue,
  gstRate: pkg.gstRate,
  taxableAmount: pkg.taxableAmount,
  gstAmount: pkg.gstAmount,
  finalPrice: pkg.finalPrice,
  deliveryDurationValue: pkg.deliveryDurationValue,
  deliveryDurationUnit: pkg.deliveryDurationUnit,
  supportPeriod: pkg.supportPeriod,
  revisionAllowance: pkg.revisionAllowance,
  termsExclusions: pkg.termsExclusions,
  createdAt: iso(pkg.createdAt),
  updatedAt: iso(pkg.updatedAt),
});
