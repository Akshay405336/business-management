import { ServicePackageQuotationIntegration } from '../../../service-packages/index.js';
import type { ServicePackageRepository } from '../../../service-packages/domain/repositories/service-package.repository.js';
import type { CrmRepository } from '../../../domain/repositories/crm.repository.js';
import { QuotationNotFoundError } from '../../domain/errors/quotation.errors.js';
import { QuotationPricingPolicy } from '../../domain/policies/quotation-pricing.policy.js';
import type {
  CreateQuotationData,
  QuotationLineItemWriteInput,
} from '../../domain/types/quotation.types.js';

export async function assertQuotationClientExists(
  crm: CrmRepository,
  organizationId: string,
  clientId: string | null | undefined,
): Promise<void> {
  if (!clientId) return;
  const client = await crm.getClient(organizationId, clientId);
  if (!client) throw new QuotationNotFoundError('Client');
}

export async function resolveLineItemsForCreate(
  organizationId: string,
  input: CreateQuotationData,
  packages: ServicePackageRepository,
): Promise<{
  lineItems: QuotationLineItemWriteInput[];
  packageSnapshot: Record<string, unknown> | null;
}> {
  let lineItems = [...(input.lineItems ?? [])];
  let packageSnapshot: Record<string, unknown> | null = null;
  const sourcePackageId = input.sourcePackageId ?? null;

  if (sourcePackageId && lineItems.length === 0) {
    const pkg = await packages.findById(organizationId, sourcePackageId);
    if (!pkg) throw new QuotationNotFoundError('Service package');
    ServicePackageQuotationIntegration.assertActiveForQuotation(pkg);
    packageSnapshot = ServicePackageQuotationIntegration.buildPackageSnapshot(pkg);
    const built = ServicePackageQuotationIntegration.buildQuotationLinesFromPackage(pkg);
    lineItems = built.lineItems;
  }

  await QuotationPricingPolicy.assertReferencedPackagesActive(lineItems, (packageId) =>
    packages.findById(organizationId, packageId),
  );

  return { lineItems, packageSnapshot };
}

export async function resolveLineItemsForUpdate(
  organizationId: string,
  lineItems: readonly QuotationLineItemWriteInput[] | undefined,
  packages: ServicePackageRepository,
): Promise<QuotationLineItemWriteInput[] | undefined> {
  if (!lineItems) return undefined;
  await QuotationPricingPolicy.assertReferencedPackagesActive(lineItems, (packageId) =>
    packages.findById(organizationId, packageId),
  );
  return [...lineItems];
}
