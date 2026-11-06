import {
  formatProposalDocumentNumber,
  normalizeProposalTaxRateFraction,
} from '@techwin/validation';
import { Decimal } from '@prisma/client/runtime/client';
import { Prisma } from '../../../../../../generated/prisma/client.js';
import type { ProposalStatus } from '../../../../domain/crm-types.js';
import { CrmNotFoundError, CrmValidationError } from '../../../../domain/errors/crm.errors.js';
import {
  computeLineItemTotals,
  computeProposalTotals,
} from '../../../services/proposal-money.js';
import type {
  CreateProposalInput,
  CrmAuditInput,
  PaginatedProposals,
  ProposalLineItemWriteInput,
  ProposalListFilters,
  ProposalRecord,
  ServicePackageRecord,
  UpdateProposalInput,
} from '../../../../domain/repositories/crm.repository.js';
import { SEQUENCE_KEYS } from '../../../../domain/repositories/crm.repository.js';
import {
  ServicePackageProposalIntegration,
  getServicePackageRow,
} from '../../../../service-packages/index.js';
import {
  assertProposalStatusTransition,
  nextSequence,
  toProposal,
  writeAudit,
  type CrmPersistenceHost,
} from './crm-persistence.shared.js';

export class CrmProposalPersistence {
  constructor(private readonly host: CrmPersistenceHost) {}

  private get prisma() {
    return this.host.prisma;
  }

  async listProposals(
    organizationId: string,
    filters: ProposalListFilters,
  ): Promise<PaginatedProposals> {
    const where: Prisma.ProposalDocumentWhereInput = { organizationId };
    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;
    if (filters.search?.trim()) {
      const q = filters.search.trim();
      where.OR = [
        { documentNumber: { contains: q, mode: 'insensitive' } },
        { title: { contains: q, mode: 'insensitive' } },
        { clientName: { contains: q, mode: 'insensitive' } },
        { companyName: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (filters.issueFrom || filters.issueTo) {
      where.issueDate = {
        ...(filters.issueFrom ? { gte: new Date(`${filters.issueFrom}T00:00:00.000Z`) } : {}),
        ...(filters.issueTo ? { lte: new Date(`${filters.issueTo}T00:00:00.000Z`) } : {}),
      };
    }
    const page = filters.page;
    const pageSize = filters.pageSize;
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.proposalDocument.count({ where }),
      this.prisma.proposalDocument.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { lineItems: { orderBy: { sortOrder: 'asc' } } },
      }),
    ]);
    return {
      items: rows.map((row) => toProposal(row)),
      total,
      page,
      pageSize,
    };
  }

  async previewProposalDocumentNumber(
    organizationId: string,
    type: ProposalRecord['type'],
  ): Promise<string> {
    const seqKey = type === 'QUOTATION' ? SEQUENCE_KEYS.quotation : SEQUENCE_KEYS.proposal;
    const row = await this.prisma.organizationSequence.findUnique({
      where: { organizationId_key: { organizationId, key: seqKey } },
    });
    const next = (row?.lastValue ?? 0) + 1;
    return formatProposalDocumentNumber(type, next);
  }

  async deleteProposal(
    organizationId: string,
    proposalId: string,
    audit: CrmAuditInput,
  ): Promise<void> {
    const existing = await this.host.getProposal(organizationId, proposalId);
    if (!existing) throw new CrmNotFoundError('Proposal');
    if (existing.status !== 'DRAFT') {
      throw new CrmValidationError('Only draft documents can be deleted.');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.proposalDocument.delete({ where: { id: proposalId } });
      await writeAudit(tx, organizationId, audit);
    });
  }

  async getProposal(organizationId: string, proposalId: string): Promise<ProposalRecord | null> {
    const row = await this.prisma.proposalDocument.findFirst({
      where: { id: proposalId, organizationId },
      include: { lineItems: { orderBy: { sortOrder: 'asc' } } },
    });
    return row ? toProposal(row) : null;
  }

  async createProposal(
    organizationId: string,
    input: CreateProposalInput,
    audit: CrmAuditInput,
  ): Promise<ProposalRecord> {
    const proposalId = crypto.randomUUID();
    let lineItems = input.lineItems ?? [];
    let packageSnapshot: unknown = null;
    const sourcePackageId = input.sourcePackageId ?? null;
    if (sourcePackageId && lineItems.length === 0) {
      const pkg = await getServicePackageRow(this.prisma, organizationId, sourcePackageId);
      if (!pkg) throw new CrmNotFoundError('Service package');
      ServicePackageProposalIntegration.assertActiveForProposal(pkg);
      packageSnapshot = ServicePackageProposalIntegration.buildPackageSnapshot(pkg);
      const built = ServicePackageProposalIntegration.buildProposalLinesFromPackage(pkg);
      lineItems = built.lineItems;
    }
    if (input.clientId) {
      const client = await this.host.getClient(organizationId, input.clientId);
      if (!client) throw new CrmNotFoundError('Client');
    }
    await assertProposalLinePackages(this.prisma, organizationId, lineItems);
    const { rows, totals } = buildLineItemRows(proposalId, lineItems);

    const row = await this.prisma.$transaction(async (tx) => {
      const seqKey = input.type === 'QUOTATION' ? SEQUENCE_KEYS.quotation : SEQUENCE_KEYS.proposal;
      const seq = await nextSequence(tx, organizationId, seqKey);
      const documentNumber = formatProposalDocumentNumber(input.type, seq);

      const proposal = await tx.proposalDocument.create({
        data: {
          id: proposalId,
          organizationId,
          documentNumber,
          type: input.type,
          title: input.title,
          description: input.description ?? '',
          leadId: input.leadId ?? null,
          clientId: input.clientId ?? null,
          issueDate: input.issueDate,
          expiryDate: input.expiryDate ?? null,
          currency: input.currency ?? 'INR',
          subtotal: totals.subtotal,
          discountTotal: totals.discountTotal,
          taxTotal: totals.taxTotal,
          grandTotal: totals.grandTotal,
          notes: input.notes ?? '',
          terms: input.terms ?? '',
          scopeOfWork: input.scopeOfWork ?? '',
          paymentTerms: input.paymentTerms ?? '',
          deliveryTimeline: input.deliveryTimeline ?? '',
          clientName: input.clientName,
          companyName: input.companyName ?? '',
          clientPhone: input.clientPhone,
          clientEmail: input.clientEmail.toLowerCase(),
          billingAddress: input.billingAddress,
          clientGstin: (input.clientGstin ?? '').toUpperCase(),
          sourcePackageId,
          packageSnapshot:
            packageSnapshot === null ? Prisma.DbNull : (packageSnapshot as Prisma.InputJsonValue),
          createdByAdminId: input.createdByAdminId,
        },
      });
      if (rows.length > 0) {
        await tx.proposalLineItem.createMany({ data: rows });
      }
      if (input.leadId) {
        await tx.leadActivity.create({
          data: {
            id: crypto.randomUUID(),
            organizationId,
            leadId: input.leadId,
            type: 'PROPOSAL_CREATED',
            title: `Proposal ${documentNumber} created`,
            description: input.title,
            occurredAt: new Date(),
            metadata: { proposalId: proposal.id, sourcePackageId },
            createdByAdminId: input.createdByAdminId,
          },
        });
      }
      await writeAudit(tx, organizationId, { ...audit, entityId: proposal.id });
      return tx.proposalDocument.findFirstOrThrow({
        where: { id: proposal.id },
        include: { lineItems: { orderBy: { sortOrder: 'asc' } } },
      });
    });
    return toProposal(row);
  }

  async updateProposal(
    organizationId: string,
    proposalId: string,
    input: UpdateProposalInput,
    audit: CrmAuditInput,
  ): Promise<ProposalRecord> {
    const existing = await this.host.getProposal(organizationId, proposalId);
    if (!existing) throw new CrmNotFoundError('Proposal');
    if (existing.status !== 'DRAFT') {
      throw new CrmValidationError('Only draft proposals can be edited.');
    }

    const lineItems = input.lineItems;
    let totals: ReturnType<typeof computeProposalTotals> = {
      subtotal: new Decimal(existing.subtotal),
      discountTotal: new Decimal(existing.discountTotal),
      taxTotal: new Decimal(existing.taxTotal),
      grandTotal: new Decimal(existing.grandTotal),
    };
    let rows: ReturnType<typeof buildLineItemRows>['rows'] | undefined;

    if (lineItems) {
      await assertProposalLinePackages(this.prisma, organizationId, lineItems);
      const built = buildLineItemRows(proposalId, lineItems);
      rows = built.rows;
      totals = built.totals;
    }

    const row = await this.prisma.$transaction(async (tx) => {
      await tx.proposalDocument.update({
        where: { id: proposalId },
        data: {
          title: input.title,
          description: input.description,
          scopeOfWork: input.scopeOfWork,
          leadId: input.leadId,
          clientId: input.clientId,
          clientName: input.clientName,
          companyName: input.companyName,
          clientPhone: input.clientPhone,
          clientEmail: input.clientEmail?.toLowerCase(),
          billingAddress: input.billingAddress,
          clientGstin: input.clientGstin?.toUpperCase(),
          issueDate: input.issueDate,
          expiryDate: input.expiryDate,
          currency: input.currency,
          notes: input.notes,
          terms: input.terms,
          paymentTerms: input.paymentTerms,
          deliveryTimeline: input.deliveryTimeline,
          subtotal: totals.subtotal,
          discountTotal: totals.discountTotal,
          taxTotal: totals.taxTotal,
          grandTotal: totals.grandTotal,
          version: { increment: 1 },
        },
      });
      if (rows) {
        await tx.proposalLineItem.deleteMany({ where: { proposalId } });
        if (rows.length > 0) await tx.proposalLineItem.createMany({ data: rows });
      }
      await writeAudit(tx, organizationId, audit);
      return tx.proposalDocument.findFirstOrThrow({
        where: { id: proposalId },
        include: { lineItems: { orderBy: { sortOrder: 'asc' } } },
      });
    });
    return toProposal(row);
  }

  async changeProposalStatus(
    organizationId: string,
    proposalId: string,
    toStatus: ProposalStatus,
    note: string,
    adminId: string,
    audit: CrmAuditInput,
  ): Promise<ProposalRecord> {
    const existing = await this.host.getProposal(organizationId, proposalId);
    if (!existing) throw new CrmNotFoundError('Proposal');
    if (existing.status === toStatus) return existing;
    assertProposalStatusTransition(existing.status, toStatus);

    const row = await this.prisma.$transaction(async (tx) => {
      const proposal = await tx.proposalDocument.update({
        where: { id: proposalId },
        data: { status: toStatus },
      });
      await tx.proposalStatusHistory.create({
        data: {
          proposalId,
          fromStatus: existing.status,
          toStatus,
          note,
          changedByAdminId: adminId,
        },
      });
      if (proposal.leadId) {
        await tx.leadActivity.create({
          data: {
            id: crypto.randomUUID(),
            organizationId,
            leadId: proposal.leadId,
            type: 'PROPOSAL_STATUS_CHANGE',
            title: `Proposal ${proposal.documentNumber} → ${toStatus}`,
            description: note,
            occurredAt: new Date(),
            metadata: { proposalId, fromStatus: existing.status, toStatus },
            createdByAdminId: adminId,
          },
        });
      }
      await writeAudit(tx, organizationId, audit);
      return tx.proposalDocument.findFirstOrThrow({
        where: { id: proposalId },
        include: { lineItems: { orderBy: { sortOrder: 'asc' } } },
      });
    });
    return toProposal(row);
  }

  async getProposalPrintData(
    organizationId: string,
    proposalId: string,
  ): Promise<ProposalRecord & { organizationName: string }> {
    const proposal = await this.host.getProposal(organizationId, proposalId);
    if (!proposal) throw new CrmNotFoundError('Proposal');
    const org = await this.prisma.organization.findFirstOrThrow({
      where: { id: organizationId },
      select: { name: true },
    });
    return { ...proposal, organizationName: org.name };
  }
}

async function assertProposalLinePackages(
  prisma: CrmPersistenceHost['prisma'],
  organizationId: string,
  items: readonly ProposalLineItemWriteInput[],
): Promise<void> {
  for (const item of items) {
    const packageId = item.sourcePackageId;
    if (!packageId) continue;
    const pkg = await getServicePackageRow(prisma, organizationId, packageId);
    if (!pkg) throw new CrmNotFoundError('Service package');
    if (pkg.status !== 'ACTIVE') throw new CrmValidationError('Service package is not active.');
  }
}

function buildLineItemRows(
  proposalId: string,
  items: readonly ProposalLineItemWriteInput[],
): {
  rows: Array<{
    id: string;
    proposalId: string;
    name: string;
    category: string;
    sourcePackageId: string | null;
    description: string;
    quantity: Decimal;
    unit: string;
    unitPrice: Decimal;
    discount: Decimal;
    taxRate: Decimal;
    lineTotal: Decimal;
    sortOrder: number;
  }>;
  totals: ReturnType<typeof computeProposalTotals>;
} {
  const computed = items.map((item, index) => {
    const taxFraction = normalizeProposalTaxRateFraction(item.taxRate ?? 0);
    const totals = computeLineItemTotals({
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount ?? 0,
      taxRate: taxFraction,
    });
    return {
      id: item.id ?? crypto.randomUUID(),
      proposalId,
      name: item.name,
      category: item.category ?? '',
      sourcePackageId: item.sourcePackageId ?? null,
      description: item.description ?? '',
      quantity: totals.quantity,
      unit: item.unit ?? 'item',
      unitPrice: totals.unitPrice,
      discount: totals.discount,
      taxRate: totals.taxRate,
      lineTotal: totals.lineTotal,
      sortOrder: item.sortOrder ?? index,
    };
  });
  const totals = computeProposalTotals(computed);
  return { rows: computed, totals };
}
