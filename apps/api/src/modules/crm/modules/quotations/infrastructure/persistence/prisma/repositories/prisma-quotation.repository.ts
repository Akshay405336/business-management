import { Inject, Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/client';
import { Prisma } from '../../../../../../../../generated/prisma/client.js';
import { CrmNotFoundError } from '../../../../../../shared/domain/errors/crm.errors.js';
import { SEQUENCE_KEYS } from '../../../../../../shared/domain/repositories/crm.repository.js';
import {
  nextSequence,
  writeAudit,
  type CrmPersistenceHost,
} from '../../../../../../shared/infrastructure/persistence/prisma/repositories/crm-persistence.shared.js';
import { QuotationNumberService } from '../../../../domain/services/quotation-number.service.js';
import type { QuotationRepository } from '../../../../domain/repositories/quotation.repository.js';
import type {
  PaginatedQuotations,
  QuotationPrintReadModel,
  QuotationReadModel,
} from '../../../../domain/types/quotation-read-model.js';
import type {
  CreateQuotationPersistData,
  QuotationAuditEntry,
  QuotationListFilters,
  QuotationPersistLineItem,
  QuotationPersistTotals,
  UpdateQuotationPersistData,
} from '../../../../domain/types/quotation.types.js';
import type { QuotationStatus } from '../../../../domain/enums/quotation-status.enum.js';
import { expiryBeforeTodayUtc } from '../../../../domain/utils/quotation-date.utils.js';
import { toQuotation } from '../mappers/quotation.mapper.js';
import { CRM_REPOSITORY } from '../../../../../../shared/domain/repositories/crm.repository.js';

@Injectable()
export class PrismaQuotationRepository implements QuotationRepository {
  constructor(@Inject(CRM_REPOSITORY) private readonly host: CrmPersistenceHost) {}

  private get prisma() {
    return this.host.prisma;
  }

  async list(organizationId: string, filters: QuotationListFilters): Promise<PaginatedQuotations> {
    const where: Prisma.QuotationDocumentWhereInput = { organizationId };
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
      this.prisma.quotationDocument.count({ where }),
      this.prisma.quotationDocument.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { lineItems: { orderBy: { sortOrder: 'asc' } } },
      }),
    ]);
    return {
      items: rows.map((row) => toQuotation(row)),
      total,
      page,
      pageSize,
    };
  }

  previewDocumentNumber(
    organizationId: string,
    type: QuotationReadModel['type'],
  ): Promise<string> {
    const seqKey = type === 'QUOTATION' ? SEQUENCE_KEYS.quotation : SEQUENCE_KEYS.proposal;
    return this.prisma.organizationSequence
      .findUnique({
        where: { organizationId_key: { organizationId, key: seqKey } },
      })
      .then((row) =>
        QuotationNumberService.previewDocumentNumber(type, row?.lastValue ?? 0),
      );
  }

  async findById(
    organizationId: string,
    quotationId: string,
  ): Promise<QuotationReadModel | null> {
    const row = await this.prisma.quotationDocument.findFirst({
      where: { id: quotationId, organizationId },
      include: { lineItems: { orderBy: { sortOrder: 'asc' } } },
    });
    return row ? toQuotation(row) : null;
  }

  async delete(
    organizationId: string,
    quotationId: string,
    audit: QuotationAuditEntry,
  ): Promise<void> {
    const existing = await this.findById(organizationId, quotationId);
    if (!existing) throw new CrmNotFoundError('Quotation');
    await this.prisma.$transaction(async (tx) => {
      await tx.quotationDocument.delete({ where: { id: quotationId } });
      await writeAudit(tx, organizationId, audit);
    });
  }

  async create(
    organizationId: string,
    input: CreateQuotationPersistData,
    audit: QuotationAuditEntry,
  ): Promise<QuotationReadModel> {
    const quotationId = input.id;
    const rows = input.lineItems.map((line) => toLineItemRow(line));

    const row = await this.prisma.$transaction(async (tx) => {
      const seqKey = input.type === 'QUOTATION' ? SEQUENCE_KEYS.quotation : SEQUENCE_KEYS.proposal;
      const seq = await nextSequence(tx, organizationId, seqKey);
      const documentNumber = QuotationNumberService.formatAssignedNumber(input.type, seq);

      const quotation = await tx.quotationDocument.create({
        data: {
          id: quotationId,
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
          ...toTotalsColumns(input.totals),
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
          sourcePackageId: input.sourcePackageId ?? null,
          packageSnapshot:
            input.packageSnapshot === null
              ? Prisma.DbNull
              : (input.packageSnapshot as Prisma.InputJsonValue),
          createdByAdminId: input.createdByAdminId,
        },
      });
      if (rows.length > 0) {
        await tx.quotationLineItem.createMany({ data: rows });
      }
      if (input.leadId) {
        await tx.leadActivity.create({
          data: {
            id: crypto.randomUUID(),
            organizationId,
            leadId: input.leadId,
            type: 'PROPOSAL_CREATED',
            title: `Quotation ${documentNumber} created`,
            description: input.title,
            occurredAt: new Date(),
            metadata: {
              quotationId: quotation.id,
              sourcePackageId: input.sourcePackageId ?? null,
            },
            createdByAdminId: input.createdByAdminId,
          },
        });
      }
      await writeAudit(tx, organizationId, { ...audit, entityId: quotation.id });
      return tx.quotationDocument.findFirstOrThrow({
        where: { id: quotation.id },
        include: { lineItems: { orderBy: { sortOrder: 'asc' } } },
      });
    });
    return toQuotation(row);
  }

  async update(
    organizationId: string,
    quotationId: string,
    input: UpdateQuotationPersistData,
    audit: QuotationAuditEntry,
  ): Promise<QuotationReadModel> {
    const existing = await this.findById(organizationId, quotationId);
    if (!existing) throw new CrmNotFoundError('Quotation');

    const totals = input.totals ?? {
      subtotal: existing.subtotal,
      discountTotal: existing.discountTotal,
      taxTotal: existing.taxTotal,
      grandTotal: existing.grandTotal,
    };
    const rows = input.lineItems?.map((line) => toLineItemRow(line));

    const row = await this.prisma.$transaction(async (tx) => {
      await tx.quotationDocument.update({
        where: { id: quotationId },
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
          ...toTotalsColumns(totals),
          version: { increment: 1 },
        },
      });
      if (rows) {
        await tx.quotationLineItem.deleteMany({ where: { quotationId } });
        if (rows.length > 0) await tx.quotationLineItem.createMany({ data: rows });
      }
      await writeAudit(tx, organizationId, audit);
      return tx.quotationDocument.findFirstOrThrow({
        where: { id: quotationId },
        include: { lineItems: { orderBy: { sortOrder: 'asc' } } },
      });
    });
    return toQuotation(row);
  }

  async changeStatus(
    organizationId: string,
    quotationId: string,
    toStatus: QuotationStatus,
    note: string,
    adminId: string,
    audit: QuotationAuditEntry,
    fromStatus: QuotationStatus,
    options?: { readonly sentAt?: Date | null },
  ): Promise<QuotationReadModel> {
    const existing = await this.findById(organizationId, quotationId);
    if (!existing) throw new CrmNotFoundError('Quotation');
    if (existing.status === toStatus && toStatus !== 'SENT') return existing;

    const sentAt =
      toStatus === 'SENT'
        ? (options?.sentAt ?? new Date())
        : options?.sentAt === undefined
          ? undefined
          : options.sentAt;

    const row = await this.prisma.$transaction(async (tx) => {
      const quotation = await tx.quotationDocument.update({
        where: { id: quotationId },
        data: {
          status: toStatus,
          ...(sentAt !== undefined ? { sentAt } : {}),
        },
      });
      await tx.quotationStatusHistory.create({
        data: {
          quotationId,
          fromStatus,
          toStatus,
          note,
          changedByAdminId: adminId,
        },
      });
      if (quotation.leadId) {
        await tx.leadActivity.create({
          data: {
            id: crypto.randomUUID(),
            organizationId,
            leadId: quotation.leadId,
            type: 'PROPOSAL_STATUS_CHANGE',
            title: `Quotation ${quotation.documentNumber} → ${toStatus}`,
            description: note,
            occurredAt: new Date(),
            metadata: { quotationId, fromStatus, toStatus },
            createdByAdminId: adminId,
          },
        });
      }
      await writeAudit(tx, organizationId, audit);
      return tx.quotationDocument.findFirstOrThrow({
        where: { id: quotationId },
        include: { lineItems: { orderBy: { sortOrder: 'asc' } } },
      });
    });
    return toQuotation(row);
  }

  async recordAudit(organizationId: string, audit: QuotationAuditEntry): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await writeAudit(tx, organizationId, audit);
    });
  }

  async listOrganizationIdsWithExpirableQuotations(now = new Date()): Promise<readonly string[]> {
    const rows = await this.prisma.quotationDocument.findMany({
      where: {
        status: { in: ['DRAFT', 'SENT'] },
        expiryDate: { not: null, lt: expiryBeforeTodayUtc(now) },
      },
      distinct: ['organizationId'],
      select: { organizationId: true },
    });
    return rows.map((row) => row.organizationId);
  }

  async expireEligible(organizationId: string, limit: number, now = new Date()): Promise<number> {
    const cutoff = expiryBeforeTodayUtc(now);
    const rows = await this.prisma.quotationDocument.findMany({
      where: {
        organizationId,
        status: { in: ['DRAFT', 'SENT'] },
        expiryDate: { not: null, lt: cutoff },
      },
      orderBy: { expiryDate: 'asc' },
      take: limit,
      select: {
        id: true,
        status: true,
        documentNumber: true,
        leadId: true,
        createdByAdminId: true,
      },
    });

    let expired = 0;
    for (const row of rows) {
      await this.changeStatus(
        organizationId,
        row.id,
        'EXPIRED',
        'Quotation validity period ended.',
        row.createdByAdminId,
        {
          type: 'QUOTATION_EXPIRED',
          adminId: null,
          entityType: 'quotation',
          entityId: row.id,
          metadata: { documentNumber: row.documentNumber },
        },
        row.status,
      );
      expired += 1;
    }
    return expired;
  }

  async getPrintData(
    organizationId: string,
    quotationId: string,
  ): Promise<QuotationPrintReadModel> {
    const quotation = await this.findById(organizationId, quotationId);
    if (!quotation) throw new CrmNotFoundError('Quotation');
    const org = await this.prisma.organization.findFirstOrThrow({
      where: { id: organizationId },
      select: { name: true },
    });
    return { ...quotation, organizationName: org.name };
  }
}

function toTotalsColumns(totals: QuotationPersistTotals) {
  return {
    subtotal: new Decimal(totals.subtotal),
    discountTotal: new Decimal(totals.discountTotal),
    taxTotal: new Decimal(totals.taxTotal),
    grandTotal: new Decimal(totals.grandTotal),
  };
}

function toLineItemRow(line: QuotationPersistLineItem) {
  return {
    id: line.id,
    quotationId: line.quotationId,
    name: line.name,
    category: line.category,
    sourcePackageId: line.sourcePackageId,
    description: line.description,
    quantity: new Decimal(line.quantity),
    unit: line.unit,
    unitPrice: new Decimal(line.unitPrice),
    discount: new Decimal(line.discount),
    taxRate: new Decimal(line.taxRate),
    lineTotal: new Decimal(line.lineTotal),
    sortOrder: line.sortOrder,
  };
}
