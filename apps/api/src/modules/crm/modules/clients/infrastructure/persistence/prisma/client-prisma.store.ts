import { Prisma } from '../../../../../../../generated/prisma/client.js';
import type { PrismaService } from '../../../../../../../infrastructure/database/prisma.service.js';
import type { CrmAuditInput } from '../../../../../shared/domain/repositories/crm.repository.js';
import { writeAudit } from '../../../../../shared/infrastructure/persistence/prisma/repositories/crm-persistence.shared.js';
import { ClientDeletionPolicy } from '../../../domain/policies/client-deletion.policy.js';
import { ClientNotFoundError } from '../../../domain/errors/client.errors.js';
import { CLIENT_SEQUENCE_KEY } from '../../../domain/types/client.types.js';
import type { ClientListFilters, CreateClientData, UpdateClientData } from '../../../domain/types/client.types.js';
import type { ClientAuditEntry } from '../../../domain/types/client.types.js';
import { previewClientReferenceFromLastValue } from './client-reference-allocation.js';
import { insertClientRowInTransaction } from './client-row.persistence.js';
import { clientRowToReadModel } from './mappers/client.mapper.js';

function buildListWhere(
  organizationId: string,
  filters: ClientListFilters,
): Prisma.ClientWhereInput {
  const where: Prisma.ClientWhereInput = { organizationId };
  if (!filters.includeArchived) {
    where.archivedAt = null;
  }
  if (filters.status) {
    where.status = filters.status;
  }
  if (filters.type) {
    where.type = filters.type;
  }
  if (filters.createdFrom || filters.createdTo) {
    where.createdAt = {
      ...(filters.createdFrom ? { gte: filters.createdFrom } : {}),
      ...(filters.createdTo ? { lte: filters.createdTo } : {}),
    };
  }
  const search = filters.search?.trim();
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { referenceNumber: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
      { primaryContact: { contains: search, mode: 'insensitive' } },
    ];
  }
  return where;
}

function resolveOrderBy(
  filters: ClientListFilters,
): Prisma.ClientOrderByWithRelationInput {
  const dir = filters.sortDir ?? 'desc';
  switch (filters.sort) {
    case 'name':
      return { name: dir };
    case 'referenceNumber':
      return { referenceNumber: dir };
    case 'createdAt':
    default:
      return { createdAt: dir };
  }
}

export async function listClientsPage(
  prisma: PrismaService,
  organizationId: string,
  filters: ClientListFilters,
) {
  const where = buildListWhere(organizationId, filters);
  const orderBy = resolveOrderBy(filters);
  const skip = (filters.page - 1) * filters.pageSize;
  const [total, rows] = await prisma.$transaction([
    prisma.client.count({ where }),
    prisma.client.findMany({
      where,
      orderBy,
      skip,
      take: filters.pageSize,
    }),
  ]);
  return {
    items: rows.map(clientRowToReadModel),
    total,
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

export async function getClientRow(
  prisma: PrismaService,
  organizationId: string,
  clientId: string,
) {
  const row = await prisma.client.findFirst({
    where: { id: clientId, organizationId },
  });
  return row ? clientRowToReadModel(row) : null;
}

/** Same-organization client with this canonical phone key (excluding archived). */
export async function findClientByNormalizedPhone(
  prisma: Prisma.TransactionClient | PrismaService,
  organizationId: string,
  phoneNormalized: string,
): Promise<ReturnType<typeof clientRowToReadModel> | null> {
  const row = await prisma.client.findFirst({
    where: {
      organizationId,
      phoneNormalized,
      archivedAt: null,
    },
  });
  return row ? clientRowToReadModel(row) : null;
}

export function previewClientReference(prisma: PrismaService, organizationId: string): Promise<string> {
  return prisma.organizationSequence
    .findUnique({
      where: { organizationId_key: { organizationId, key: CLIENT_SEQUENCE_KEY } },
      select: { lastValue: true },
    })
    .then((row) => previewClientReferenceFromLastValue(row?.lastValue));
}

export async function createClientRow(
  prisma: PrismaService,
  organizationId: string,
  clientId: string,
  input: CreateClientData,
  audit: ClientAuditEntry,
) {
  const row = await prisma.$transaction(async (tx) =>
    insertClientRowInTransaction(tx, organizationId, clientId, input, audit),
  );
  return row;
}

export async function updateClientRow(
  prisma: PrismaService,
  organizationId: string,
  clientId: string,
  input: UpdateClientData,
  audit: ClientAuditEntry,
) {
  const existing = await getClientRow(prisma, organizationId, clientId);
  if (!existing) throw new ClientNotFoundError('Client');
  const row = await prisma.$transaction(async (tx) => {
    const client = await tx.client.update({
      where: { id: clientId },
      data: {
        type: input.type,
        name: input.name,
        primaryContact: input.primaryContact,
        email: input.email,
        phone: input.phone,
        phoneNormalized: input.phoneNormalized,
        website: input.website,
        billingAddress: input.billingAddress,
        taxRegistration: input.taxRegistration,
        status: input.status,
        notes: input.notes,
        archivedAt: input.archivedAt,
      },
    });
    await writeAudit(tx, organizationId, audit);
    return client;
  });
  return clientRowToReadModel(row);
}

async function countClientDependencies(
  prisma: PrismaService,
  organizationId: string,
  clientId: string,
) {
  const [projectCount, quotationCount, convertedLeadCount, whatsAppContactCount] =
    await Promise.all([
      prisma.project.count({ where: { organizationId, clientId } }),
      prisma.quotationDocument.count({ where: { organizationId, clientId } }),
      prisma.lead.count({ where: { organizationId, convertedClientId: clientId } }),
      prisma.whatsAppContact.count({ where: { organizationId, clientId } }),
    ]);
  return { projectCount, quotationCount, convertedLeadCount, whatsAppContactCount };
}

export async function deleteClientRow(
  prisma: PrismaService,
  organizationId: string,
  clientId: string,
  audit: ClientAuditEntry,
): Promise<void> {
  const existing = await getClientRow(prisma, organizationId, clientId);
  if (!existing) throw new ClientNotFoundError('Client');
  const counts = await countClientDependencies(prisma, organizationId, clientId);
  ClientDeletionPolicy.assertCanDelete(counts);
  await prisma.$transaction(async (tx) => {
    await tx.client.delete({ where: { id: clientId } });
    await writeAudit(tx, organizationId, { ...(audit as CrmAuditInput), entityId: clientId });
  });
}
