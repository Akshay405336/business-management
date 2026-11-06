import type { CrmAuditEventType } from '../../../../shared/domain/crm-types.js';
import type { ServicePackageStatus } from '../enums/service-package-status.enum.js';

export type ServicePackageDeliveryUnit = 'DAYS' | 'WEEKS' | 'MONTHS';
export type PackageDiscountType = 'FIXED' | 'PERCENT';

export interface ServicePackageAuditEntry {
  readonly type: CrmAuditEventType;
  readonly adminId: string;
  readonly entityType: 'service_package';
  readonly entityId: string;
}

export interface ServicePackageWriteInput {
  readonly code?: string;
  readonly name?: string;
  readonly categories?: unknown;
  readonly deliveryDurationValue?: number | null;
  readonly deliveryDurationUnit?: ServicePackageDeliveryUnit | null;
  readonly shortDescription?: string;
  readonly detailedDescription?: string;
  readonly technologyStack?: unknown;
  readonly includedPages?: unknown;
  readonly integrations?: unknown;
  readonly adminPanelFeatures?: unknown;
  readonly hostingDeployment?: unknown;
  readonly deliveryServices?: unknown;
  readonly integrationNotes?: string;
  readonly pageCount?: number | null;
  readonly basePrice?: string | number;
  readonly addOns?: unknown;
  readonly discountType?: PackageDiscountType | null;
  readonly discountValue?: string | number;
  readonly gstRate?: string | number | null;
  readonly supportPeriod?: string;
  readonly revisionAllowance?: string;
  readonly termsExclusions?: string;
  readonly createdByAdminId?: string;
}

export interface CreateServicePackageData extends ServicePackageWriteInput {
  readonly name: string;
  readonly categories: unknown;
  readonly basePrice: string | number;
  readonly discountType: PackageDiscountType;
  readonly discountValue: string | number;
  readonly gstRate?: string | number | null;
  readonly deliveryDurationValue: number;
  readonly deliveryDurationUnit: ServicePackageDeliveryUnit;
  readonly createdByAdminId: string;
}

export interface ChangeServicePackageStatusData {
  readonly status: ServicePackageStatus;
}

export type UpdateServicePackageData = ServicePackageWriteInput;
