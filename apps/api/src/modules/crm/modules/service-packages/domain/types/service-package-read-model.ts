import type {
  PackageDiscountType,
  ServicePackageDeliveryUnit,
} from './service-package.types.js';
import type { ServicePackageStatus } from '../enums/service-package-status.enum.js';

/** Organization-scoped service package as returned from persistence (read model). */
export interface ServicePackageReadModel {
  readonly id: string;
  readonly organizationId: string;
  readonly code: string;
  readonly name: string;
  readonly categories: unknown;
  readonly shortDescription: string;
  readonly detailedDescription: string;
  readonly status: ServicePackageStatus;
  readonly technologyStack: unknown;
  readonly includedPages: unknown;
  readonly integrations: unknown;
  readonly adminPanelFeatures: unknown;
  readonly hostingDeployment: unknown;
  readonly deliveryServices: unknown;
  readonly integrationNotes: string;
  readonly pageCount: number | null;
  readonly basePrice: string;
  readonly addOns: unknown;
  readonly discountType: PackageDiscountType;
  readonly discountValue: string;
  readonly gstRate: string;
  readonly taxableAmount: string;
  readonly gstAmount: string;
  readonly finalPrice: string;
  readonly deliveryDurationValue: number | null;
  readonly deliveryDurationUnit: ServicePackageDeliveryUnit | null;
  readonly supportPeriod: string;
  readonly revisionAllowance: string;
  readonly termsExclusions: string;
  readonly createdByAdminId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
