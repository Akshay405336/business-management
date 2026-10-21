import {
  formatServicePackageCode,
  isValidServicePackageCode,
  normalizeGstRatePercent,
  SERVICE_PACKAGE_CODE_SEQUENCE_KEY,
} from '@techwin/validation';
import type { Prisma } from '../../../../../generated/prisma/client.js';
import { Decimal } from '@prisma/client/runtime/client';
import type {
  ServicePackageRecord,
  ServicePackageWriteInput,
} from '../../../domain/repositories/crm.repository.js';
import { CrmConflictError, CrmNotFoundError } from '../../../domain/errors/crm.errors.js';
import { computeServicePackagePricing } from '../../services/service-package-money.js';
import {
  computeLineItemTotals,
  computeProposalTotals,
  decimalToString,
} from '../../services/proposal-money.js';

type AddOnRow = {
  name?: string;
  price?: string | number;
  active?: boolean;
  taxExempt?: boolean;
  gstRatePercent?: string | number | null;
};

const toRecord = (row: {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  categories: unknown;
  shortDescription: string;
  detailedDescription: string;
  status: ServicePackageRecord['status'];
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
  deliveryDurationUnit: ServicePackageRecord['deliveryDurationUnit'];
  supportPeriod: string;
  revisionAllowance: string;
  termsExclusions: string;
  createdByAdminId: string;
  createdAt: Date;
  updatedAt: Date;
}): ServicePackageRecord => ({
  ...row,
  discountType: row.discountType ?? 'FIXED',
  basePrice: decimalToString(row.basePrice),
  discountValue: decimalToString(row.discountValue),
  gstRate: normalizeGstRatePercent(row.gstRate.toFixed(4)),
  taxableAmount: decimalToString(row.taxableAmount),
  gstAmount: decimalToString(row.gstAmount),
  finalPrice: decimalToString(row.finalPrice),
});

const parseAddOns = (value: unknown): AddOnRow[] =>
  Array.isArray(value) ? (value as AddOnRow[]) : [];

const pricingFromInput = (input: ServicePackageWriteInput) => {
  const addOns = parseAddOns(input.addOns).map((item) => ({
    price: item.price ?? 0,
    active: item.active,
    taxExempt: item.taxExempt,
    gstRatePercent: item.gstRatePercent,
  }));
  return computeServicePackagePricing({
    basePrice: input.basePrice ?? 0,
    addOns,
    discountType: input.discountType ?? 'FIXED',
    discountValue: input.discountValue ?? 0,
    gstRatePercent: normalizeGstRatePercent(input.gstRate ?? 0),
  });
};

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
): Promise<readonly ServicePackageRecord[]> {
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
): Promise<ServicePackageRecord | null> {
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
): Promise<ServicePackageRecord> {
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
      throw new CrmConflictError('A package with this code already exists.');
    }
    throw error;
  }
}

export async function updateServicePackage(
  tx: Prisma.TransactionClient,
  organizationId: string,
  packageId: string,
  input: ServicePackageWriteInput,
): Promise<ServicePackageRecord> {
  const existing = await getServicePackage(tx, organizationId, packageId);
  if (!existing) throw new CrmNotFoundError('Service package');
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

export async function deleteServicePackage(
  tx: Prisma.TransactionClient,
  organizationId: string,
  packageId: string,
): Promise<void> {
  const existing = await getServicePackage(tx, organizationId, packageId);
  if (!existing) throw new CrmNotFoundError('Service package');
  await tx.servicePackage.delete({ where: { id: packageId } });
}

export async function changeServicePackageStatus(
  tx: Prisma.TransactionClient,
  organizationId: string,
  packageId: string,
  status: ServicePackageRecord['status'],
): Promise<ServicePackageRecord> {
  const existing = await getServicePackage(tx, organizationId, packageId);
  if (!existing) throw new CrmNotFoundError('Service package');
  const row = await tx.servicePackage.update({
    where: { id: packageId },
    data: { status },
  });
  return toRecord(row);
}

export function buildProposalLinesFromPackage(pkg: ServicePackageRecord): {
  readonly lineItems: {
    name: string;
    description: string;
    quantity: string;
    unit: string;
    unitPrice: string;
    discount: string;
    taxRate: string;
    sortOrder: number;
  }[];
  readonly totals: ReturnType<typeof computeProposalTotals>;
} {
  const addOns = parseAddOns(pkg.addOns);
  const pricing = computeServicePackagePricing({
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
  const categories = Array.isArray(pkg.categories) ? (pkg.categories as { label?: string }[]) : [];
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
      discount: decimalToString(pricing.discountAmount),
      taxRate: taxRateFraction.toFixed(4),
      sortOrder: 0,
    },
  ];
  const computed = lines.map((line) => ({
    ...computeLineItemTotals(line),
    sortOrder: line.sortOrder,
  }));
  return {
    lineItems: lines,
    totals: computeProposalTotals(computed),
  };
}

export function buildPackageSnapshot(pkg: ServicePackageRecord): Record<string, unknown> {
  return {
    ...pkg,
    snapshotAt: new Date().toISOString(),
  };
}
