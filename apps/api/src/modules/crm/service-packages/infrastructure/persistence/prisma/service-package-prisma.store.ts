import {
  formatServicePackageCode,
  isValidServicePackageCode,
  normalizeGstRatePercent,
  SERVICE_PACKAGE_CODE_SEQUENCE_KEY,
} from '@techwin/validation';
import type { Prisma } from '../../../../../../generated/prisma/client.js';
import type { ServicePackageReadModel } from '../../../domain/types/service-package-read-model.js';
import type { ServicePackageWriteInput } from '../../../domain/types/service-package.types.js';
import {
  ServicePackageConflictError,
  ServicePackageNotFoundError,
} from '../../../domain/errors/service-package.errors.js';
import { ServicePackageDeletionPolicy } from '../../../domain/policies/service-package-deletion.policy.js';
import { ServicePackagePricingService } from '../../../domain/services/service-package-pricing.service.js';
import { ServicePackageName } from '../../../domain/value-objects/service-package-name.vo.js';
import {
  ServicePackageMapper,
  type ServicePackagePrismaRow,
} from './mappers/service-package.mapper.js';

const toRecord = (row: ServicePackagePrismaRow): ServicePackageReadModel =>
  ServicePackageMapper.toReadModel(row);

const pricingFromInput = (input: ServicePackageWriteInput) =>
  ServicePackagePricingService.computeFromWriteInput(input);

export async function assertUniqueServicePackageName(
  tx: Prisma.TransactionClient | { servicePackage: Prisma.ServicePackageDelegate },
  organizationId: string,
  name: string,
  excludePackageId?: string,
): Promise<void> {
  const normalized = ServicePackageName.normalizeForComparison(name);
  const rows = await tx.servicePackage.findMany({
    where: { organizationId },
    select: { id: true, name: true },
  });
  const conflict = rows.find(
    (row) =>
      row.id !== excludePackageId &&
      ServicePackageName.normalizeForComparison(row.name) === normalized,
  );
  if (conflict) {
    throw new ServicePackageConflictError('A package with this name already exists.');
  }
}

/** Predicts the next code without incrementing the sequence (not reserved). */
export async function previewServicePackageCode(
  db: { organizationSequence: Prisma.OrganizationSequenceDelegate },
  organizationId: string,
): Promise<string> {
  const row = await db.organizationSequence.findUnique({
    where: {
      organizationId_key: { organizationId, key: SERVICE_PACKAGE_CODE_SEQUENCE_KEY },
    },
    select: { lastValue: true },
  });
  const next = (row?.lastValue ?? 0) + 1;
  return formatServicePackageCode(next);
}

/** Atomically increments the org sequence and returns the assigned code. */
export async function nextServicePackageCode(
  tx: Prisma.TransactionClient,
  organizationId: string,
): Promise<string> {
  const row = await tx.organizationSequence.upsert({
    where: {
      organizationId_key: { organizationId, key: SERVICE_PACKAGE_CODE_SEQUENCE_KEY },
    },
    create: { organizationId, key: SERVICE_PACKAGE_CODE_SEQUENCE_KEY, lastValue: 1 },
    update: { lastValue: { increment: 1 } },
    select: { lastValue: true },
  });
  const code = formatServicePackageCode(row.lastValue);
  if (!isValidServicePackageCode(code)) {
    throw new Error('Generated service package code failed validation.');
  }
  return code;
}

export async function listServicePackages(
  tx: Prisma.TransactionClient | { servicePackage: Prisma.ServicePackageDelegate },
  organizationId: string,
): Promise<readonly ServicePackageReadModel[]> {
  const rows = await tx.servicePackage.findMany({
    where: { organizationId },
    orderBy: [{ status: 'asc' }, { name: 'asc' }],
  });
  return rows.map(toRecord);
}

export async function getServicePackage(
  tx: Prisma.TransactionClient | { servicePackage: Prisma.ServicePackageDelegate },
  organizationId: string,
  packageId: string,
): Promise<ServicePackageReadModel | null> {
  const row = await tx.servicePackage.findFirst({ where: { id: packageId, organizationId } });
  return row ? toRecord(row) : null;
}

export async function createServicePackage(
  tx: Prisma.TransactionClient,
  organizationId: string,
  input: ServicePackageWriteInput & {
    name: string;
    categories: unknown;
    createdByAdminId: string;
  },
  code: string,
): Promise<ServicePackageReadModel> {
  await assertUniqueServicePackageName(tx, organizationId, input.name);
  const pricing = pricingFromInput(input);
  const normalizedCode = code.trim().toUpperCase();
  if (!isValidServicePackageCode(normalizedCode)) {
    throw new Error('Invalid service package code.');
  }
  try {
    const row = await tx.servicePackage.create({
      data: {
        id: crypto.randomUUID(),
        organizationId,
        code: normalizedCode,
        name: input.name,
        categories: input.categories ?? [],
        shortDescription: input.shortDescription ?? '',
        detailedDescription: input.detailedDescription ?? '',
        status: 'ACTIVE',
        technologyStack: input.technologyStack ?? [],
        includedPages: input.includedPages ?? [],
        integrations: input.integrations ?? [],
        adminPanelFeatures: input.adminPanelFeatures ?? [],
        hostingDeployment: input.hostingDeployment ?? [],
        deliveryServices: input.deliveryServices ?? [],
        integrationNotes: input.integrationNotes ?? '',
        pageCount: input.pageCount ?? null,
        basePrice: input.basePrice ?? 0,
        addOns: input.addOns ?? [],
        discountType: input.discountType ?? 'FIXED',
        discountValue: input.discountValue ?? 0,
        gstRate: normalizeGstRatePercent(input.gstRate ?? 0),
        taxableAmount: pricing.taxableAmount,
        gstAmount: pricing.gstAmount,
        finalPrice: pricing.finalPrice,
        deliveryDurationValue: input.deliveryDurationValue ?? null,
        deliveryDurationUnit: input.deliveryDurationUnit ?? null,
        supportPeriod: input.supportPeriod ?? '',
        revisionAllowance: input.revisionAllowance ?? '',
        termsExclusions: input.termsExclusions ?? '',
        createdByAdminId: input.createdByAdminId,
      },
    });
    return toRecord(row);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      throw new ServicePackageConflictError('A package with this code already exists.');
    }
    throw error;
  }
}

export async function updateServicePackage(
  tx: Prisma.TransactionClient,
  organizationId: string,
  packageId: string,
  input: ServicePackageWriteInput,
): Promise<ServicePackageReadModel> {
  const existing = await getServicePackage(tx, organizationId, packageId);
  if (!existing) throw new ServicePackageNotFoundError('Service package');
  if (input.name !== undefined) {
    await assertUniqueServicePackageName(tx, organizationId, input.name, packageId);
  }
  const merged: ServicePackageWriteInput = {
    basePrice: input.basePrice ?? existing.basePrice,
    addOns: input.addOns ?? existing.addOns,
    discountType: input.discountType ?? existing.discountType,
    discountValue: input.discountValue ?? existing.discountValue,
    gstRate: input.gstRate !== undefined ? (input.gstRate ?? 0) : existing.gstRate,
    categories: input.categories ?? existing.categories,
    deliveryDurationValue:
      input.deliveryDurationValue === undefined
        ? existing.deliveryDurationValue
        : input.deliveryDurationValue,
    deliveryDurationUnit:
      input.deliveryDurationUnit === undefined
        ? existing.deliveryDurationUnit
        : input.deliveryDurationUnit,
    name: input.name ?? existing.name,
    shortDescription: input.shortDescription ?? existing.shortDescription,
    detailedDescription: input.detailedDescription ?? existing.detailedDescription,
    technologyStack: input.technologyStack ?? existing.technologyStack,
    includedPages: input.includedPages ?? existing.includedPages,
    integrations: input.integrations ?? existing.integrations,
    adminPanelFeatures: input.adminPanelFeatures ?? existing.adminPanelFeatures,
    hostingDeployment: input.hostingDeployment ?? existing.hostingDeployment,
    deliveryServices: input.deliveryServices ?? existing.deliveryServices,
    integrationNotes: input.integrationNotes ?? existing.integrationNotes,
    pageCount: input.pageCount === undefined ? existing.pageCount : input.pageCount,
    supportPeriod: input.supportPeriod ?? existing.supportPeriod,
    revisionAllowance: input.revisionAllowance ?? existing.revisionAllowance,
    termsExclusions: input.termsExclusions ?? existing.termsExclusions,
  };
  const pricing = pricingFromInput(merged);
  const row = await tx.servicePackage.update({
    where: { id: packageId },
    data: {
      name: input.name,
      categories: input.categories as Prisma.InputJsonValue | undefined,
      shortDescription: input.shortDescription,
      detailedDescription: input.detailedDescription,
      technologyStack: input.technologyStack as Prisma.InputJsonValue | undefined,
      includedPages: input.includedPages as Prisma.InputJsonValue | undefined,
      integrations: input.integrations as Prisma.InputJsonValue | undefined,
      adminPanelFeatures: input.adminPanelFeatures as Prisma.InputJsonValue | undefined,
      hostingDeployment: input.hostingDeployment as Prisma.InputJsonValue | undefined,
      deliveryServices: input.deliveryServices as Prisma.InputJsonValue | undefined,
      integrationNotes: input.integrationNotes,
      pageCount: input.pageCount,
      basePrice: input.basePrice,
      addOns: input.addOns as Prisma.InputJsonValue | undefined,
      discountType: input.discountType,
      discountValue: input.discountValue,
      gstRate:
        input.gstRate === undefined
          ? undefined
          : normalizeGstRatePercent(input.gstRate ?? 0),
      taxableAmount: pricing.taxableAmount,
      gstAmount: pricing.gstAmount,
      finalPrice: pricing.finalPrice,
      deliveryDurationValue: input.deliveryDurationValue,
      deliveryDurationUnit: input.deliveryDurationUnit,
      supportPeriod: input.supportPeriod,
      revisionAllowance: input.revisionAllowance,
      termsExclusions: input.termsExclusions,
    },
  });
  return toRecord(row);
}

export async function countQuotationReferencesToPackage(
  db: Prisma.TransactionClient | { quotationLineItem: Prisma.QuotationLineItemDelegate; quotationDocument: Prisma.QuotationDocumentDelegate },
  organizationId: string,
  packageId: string,
): Promise<number> {
  const [lineItemRefs, documentRefs] = await Promise.all([
    db.quotationLineItem.count({
      where: {
        sourcePackageId: packageId,
        quotation: { organizationId },
      },
    }),
    db.quotationDocument.count({
      where: {
        organizationId,
        sourcePackageId: packageId,
      },
    }),
  ]);
  return lineItemRefs + documentRefs;
}

export async function deleteServicePackage(
  tx: Prisma.TransactionClient,
  organizationId: string,
  packageId: string,
): Promise<void> {
  const existing = await getServicePackage(tx, organizationId, packageId);
  if (!existing) throw new ServicePackageNotFoundError('Service package');
  const referenceCount = await countQuotationReferencesToPackage(tx, organizationId, packageId);
  ServicePackageDeletionPolicy.assertCanDelete(referenceCount);
  await tx.servicePackage.delete({ where: { id: packageId } });
}

export async function changeServicePackageStatus(
  tx: Prisma.TransactionClient,
  organizationId: string,
  packageId: string,
  status: ServicePackageReadModel['status'],
): Promise<ServicePackageReadModel> {
  const existing = await getServicePackage(tx, organizationId, packageId);
  if (!existing) throw new ServicePackageNotFoundError('Service package');
  const row = await tx.servicePackage.update({
    where: { id: packageId },
    data: { status },
  });
  return toRecord(row);
}
