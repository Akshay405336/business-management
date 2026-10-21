import type {
  CreateServicePackageRequest,
  UpdateServicePackageRequest,
} from '@techwin/validation';
import type {
  CreateServicePackageInput,
  UpdateServicePackageInput,
} from '../../../domain/repositories/crm.repository.js';

const mapConfiguration = (
  body: CreateServicePackageRequest | UpdateServicePackageRequest,
): UpdateServicePackageInput => ({
  shortDescription: body.shortDescription,
  detailedDescription: body.detailedDescription,
  technologyStack: body.technologyStack,
  includedPages: body.includedPages,
  integrations: body.integrations,
  adminPanelFeatures: body.adminPanelFeatures,
  hostingDeployment: body.hostingDeployment,
  deliveryServices: body.deliveryServices,
  integrationNotes: body.integrationNotes,
  pageCount: body.pageCount,
  addOns: body.addOns,
  supportPeriod: body.supportPeriod,
  revisionAllowance: body.revisionAllowance,
  termsExclusions: body.termsExclusions,
});

export const toCreateServicePackageInput = (
  body: CreateServicePackageRequest,
  createdByAdminId: string,
): CreateServicePackageInput => ({
  ...mapConfiguration(body),
  name: body.name,
  categories: body.categories,
  basePrice: body.basePrice,
  discountType: body.discountType,
  discountValue: body.discountValue,
  gstRate: body.gstRatePercent,
  deliveryDurationValue: body.deliveryDurationValue,
  deliveryDurationUnit: body.deliveryDurationUnit,
  createdByAdminId,
});

export const toUpdateServicePackageInput = (
  body: UpdateServicePackageRequest,
): UpdateServicePackageInput => ({
  ...mapConfiguration(body),
  name: body.name,
  categories: body.categories,
  basePrice: body.basePrice,
  discountType: body.discountType,
  discountValue: body.discountValue,
  gstRate: body.gstRatePercent,
  deliveryDurationValue: body.deliveryDurationValue,
  deliveryDurationUnit: body.deliveryDurationUnit,
});
