import type {
  CatalogSelection,
  CrmServicePackage,
  PackageDiscountType,
  ServicePackageDeliveryUnit,
} from '../types/service-package.types';
import type { CreateServicePackageRequest } from '../types/service-package.types';

export type AddOnFormRow = {
  key: string;
  name: string;
  description: string;
  price: string;
  gstRatePercent: string;
  taxExempt: boolean;
  active: boolean;
};

export type ServicePackageFormState = {
  displayCode: string;
  name: string;
  categories: CatalogSelection[];
  shortDescription: string;
  detailedDescription: string;
  technologyStack: CatalogSelection[];
  includedPages: CatalogSelection[];
  integrations: CatalogSelection[];
  adminPanelFeatures: CatalogSelection[];
  hostingDeployment: CatalogSelection[];
  deliveryServices: CatalogSelection[];
  integrationNotes: string;
  pageCount: string;
  basePrice: string;
  discountType: PackageDiscountType;
  discountValue: string;
  gstRate: string;
  deliveryDurationValue: string;
  deliveryDurationUnit: ServicePackageDeliveryUnit;
  supportPeriod: string;
  revisionAllowance: string;
  termsExclusions: string;
  addOns: AddOnFormRow[];
};

export const DELIVERY_UNITS: { value: ServicePackageDeliveryUnit; label: string }[] = [
  { value: 'DAYS', label: 'Days' },
  { value: 'WEEKS', label: 'Weeks' },
  { value: 'MONTHS', label: 'Months' },
];

export function emptyServicePackageForm(): ServicePackageFormState {
  return {
    displayCode: '',
    name: '',
    categories: [],
    shortDescription: '',
    detailedDescription: '',
    technologyStack: [],
    includedPages: [],
    integrations: [],
    adminPanelFeatures: [],
    hostingDeployment: [],
    deliveryServices: [],
    integrationNotes: '',
    pageCount: '',
    basePrice: '0',
    discountType: 'FIXED',
    discountValue: '0',
    gstRate: '',
    deliveryDurationValue: '15',
    deliveryDurationUnit: 'DAYS',
    supportPeriod: '',
    revisionAllowance: '',
    termsExclusions: '',
    addOns: [],
  };
}

export function servicePackageToForm(pkg: CrmServicePackage): ServicePackageFormState {
  return {
    displayCode: pkg.code,
    name: pkg.name,
    categories: [...pkg.categories],
    shortDescription: pkg.shortDescription,
    detailedDescription: pkg.detailedDescription,
    technologyStack: [...pkg.technologyStack],
    includedPages: [...pkg.includedPages],
    integrations: [...pkg.integrations],
    adminPanelFeatures: [...pkg.adminPanelFeatures],
    hostingDeployment: [...pkg.hostingDeployment],
    deliveryServices: [...pkg.deliveryServices],
    integrationNotes: pkg.integrationNotes,
    pageCount: pkg.pageCount === null ? '' : String(pkg.pageCount),
    basePrice: pkg.basePrice,
    discountType: pkg.discountType,
    discountValue: pkg.discountValue,
    gstRate: pkg.gstRate === '0' ? '' : pkg.gstRate,
    deliveryDurationValue:
      pkg.deliveryDurationValue === null ? '' : String(pkg.deliveryDurationValue),
    deliveryDurationUnit: pkg.deliveryDurationUnit ?? 'DAYS',
    supportPeriod: pkg.supportPeriod,
    revisionAllowance: pkg.revisionAllowance,
    termsExclusions: pkg.termsExclusions,
    addOns: pkg.addOns.map((item, index) => ({
      key: item.id ?? `addon-${index}`,
      name: item.name,
      description: item.description ?? '',
      price: item.price,
      gstRatePercent: item.gstRatePercent ?? '',
      taxExempt: item.taxExempt ?? false,
      active: item.active ?? true,
    })),
  };
}

export function buildServicePackagePayload(
  form: ServicePackageFormState,
): CreateServicePackageRequest {
  return {
    name: form.name.trim(),
    categories: form.categories,
    shortDescription: form.shortDescription.trim() || undefined,
    detailedDescription: form.detailedDescription.trim() || undefined,
    technologyStack: form.technologyStack,
    includedPages: form.includedPages,
    integrations: form.integrations,
    adminPanelFeatures: form.adminPanelFeatures,
    hostingDeployment: form.hostingDeployment,
    deliveryServices: form.deliveryServices,
    integrationNotes: form.integrationNotes.trim() || undefined,
    pageCount: form.pageCount ? Number(form.pageCount) : undefined,
    basePrice: form.basePrice,
    addOns: form.addOns
      .filter((row) => row.name.trim())
      .map((row) => ({
        name: row.name.trim(),
        description: row.description.trim() || undefined,
        price: row.price || '0',
        gstRatePercent: row.gstRatePercent.trim() ? row.gstRatePercent : null,
        taxExempt: row.taxExempt,
        active: row.active,
      })),
    discountType: form.discountType,
    discountValue: form.discountValue.trim() === '' ? '0' : form.discountValue,
    gstRatePercent: form.gstRate.trim() === '' ? null : form.gstRate,
    deliveryDurationValue: Number(form.deliveryDurationValue),
    deliveryDurationUnit: form.deliveryDurationUnit,
    supportPeriod: form.supportPeriod.trim() || undefined,
    revisionAllowance: form.revisionAllowance.trim() || undefined,
    termsExclusions: form.termsExclusions.trim() || undefined,
  };
}

export function formatCategorySummary(categories: readonly CatalogSelection[]): string {
  if (categories.length === 0) return '—';
  const head = categories.slice(0, 2).map((item) => item.label);
  const tail = categories.length > 2 ? ` +${categories.length - 2}` : '';
  return `${head.join(', ')}${tail}`;
}

export type ServicePackageStatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

export type ServicePackageSortKey =
  | 'default'
  | 'name-asc'
  | 'name-desc'
  | 'price-desc'
  | 'price-asc'
  | 'updated-desc';

export function filterAndSortServicePackages(
  packages: readonly CrmServicePackage[],
  options: {
    search: string;
    status: ServicePackageStatusFilter;
    sortKey: ServicePackageSortKey;
  },
): CrmServicePackage[] {
  const q = options.search.trim().toLowerCase();
  const filtered = packages.filter((pkg) => {
    if (options.status !== 'ALL' && pkg.status !== options.status) return false;
    if (!q) return true;
    return (
      pkg.name.toLowerCase().includes(q) ||
      pkg.code.toLowerCase().includes(q) ||
      pkg.shortDescription.toLowerCase().includes(q) ||
      pkg.categories.some((item) => item.label.toLowerCase().includes(q))
    );
  });

  const items = [...filtered];
  switch (options.sortKey) {
    case 'name-asc':
      return items.sort((a, b) => a.name.localeCompare(b.name));
    case 'name-desc':
      return items.sort((a, b) => b.name.localeCompare(a.name));
    case 'price-desc':
      return items.sort(
        (a, b) => Number(b.finalPrice) - Number(a.finalPrice) || a.name.localeCompare(b.name),
      );
    case 'price-asc':
      return items.sort(
        (a, b) => Number(a.finalPrice) - Number(b.finalPrice) || a.name.localeCompare(b.name),
      );
    case 'updated-desc':
      return items.sort(
        (a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.name.localeCompare(b.name),
      );
    default:
      return items.sort(
        (a, b) =>
          a.status.localeCompare(b.status) || a.name.localeCompare(b.name),
      );
  }
}

/** Backend field: `pageCount` (optional manual total). */
export function formatPageCount(pageCount: number | null | undefined): string {
  if (pageCount === null || pageCount === undefined) return '—';
  return String(pageCount);
}

export function formatCatalogLabels(items: readonly { label: string }[]): string {
  if (items.length === 0) return '—';
  return items.map((item) => item.label).join(', ');
}

export function formatDeliveryDuration(pkg: CrmServicePackage): string {
  if (pkg.deliveryDurationValue === null || pkg.deliveryDurationValue === undefined || !pkg.deliveryDurationUnit) {
    return '—';
  }
  const unit =
    DELIVERY_UNITS.find((item) => item.value === pkg.deliveryDurationUnit)?.label ??
    pkg.deliveryDurationUnit;
  return `${pkg.deliveryDurationValue} ${unit.toLowerCase()}`;
}
