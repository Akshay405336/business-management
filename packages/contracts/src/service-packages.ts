import { API_PREFIX } from './http.js';

export const SERVICE_PACKAGE_ROUTES = {
  packages: `${API_PREFIX}/crm/service-packages`,
  package: (id: string) => `${API_PREFIX}/crm/service-packages/${id}`,
  packageStatus: (id: string) => `${API_PREFIX}/crm/service-packages/${id}/status`,
  codePreview: `${API_PREFIX}/crm/service-packages/code-preview`,
} as const;

export interface ServicePackageCodePreviewResponse {
  /** Predicted next code; not reserved until create succeeds. */
  readonly code: string;
  readonly isPreview: true;
}

export type ServicePackageStatus = 'ACTIVE' | 'INACTIVE';
export type PackageDiscountType = 'FIXED' | 'PERCENT';
export type ServicePackageDeliveryUnit = 'DAYS' | 'WEEKS' | 'MONTHS';

export interface CatalogSelection {
  readonly id: string;
  readonly label: string;
  readonly category?: string;
  readonly custom?: boolean;
}

export interface ServicePackageAddOn {
  readonly id?: string;
  readonly name: string;
  readonly description?: string;
  readonly price: string;
  /** Percentage (18 = 18%). When omitted, the package GST rate applies. */
  readonly gstRatePercent?: string | null;
  readonly taxExempt?: boolean;
  readonly active?: boolean;
}

export interface CrmServicePackage {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly categories: readonly CatalogSelection[];
  readonly shortDescription: string;
  readonly detailedDescription: string;
  readonly status: ServicePackageStatus;
  readonly technologyStack: readonly CatalogSelection[];
  readonly includedPages: readonly CatalogSelection[];
  readonly integrations: readonly CatalogSelection[];
  readonly adminPanelFeatures: readonly CatalogSelection[];
  readonly hostingDeployment: readonly CatalogSelection[];
  readonly deliveryServices: readonly CatalogSelection[];
  readonly integrationNotes: string;
  readonly pageCount: number | null;
  readonly basePrice: string;
  readonly addOns: readonly ServicePackageAddOn[];
  readonly discountType: PackageDiscountType;
  readonly discountValue: string;
  /** GST percentage (18 = 18%). */
  readonly gstRate: string;
  readonly taxableAmount: string;
  readonly gstAmount: string;
  readonly finalPrice: string;
  readonly deliveryDurationValue: number | null;
  readonly deliveryDurationUnit: ServicePackageDeliveryUnit | null;
  readonly supportPeriod: string;
  readonly revisionAllowance: string;
  readonly termsExclusions: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CrmServicePackageListResponse {
  readonly packages: readonly CrmServicePackage[];
}

export interface ServicePackageSnapshot extends CrmServicePackage {
  readonly snapshotAt: string;
}
