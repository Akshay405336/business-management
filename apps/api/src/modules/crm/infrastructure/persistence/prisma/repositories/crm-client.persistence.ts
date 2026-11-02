import { CrmNotFoundError } from '../../../../domain/errors/crm.errors.js';
import type {
  ClientRecord,
  CreateClientInput,
  CrmAuditInput,
  UpdateClientInput,
} from '../../../../domain/repositories/crm.repository.js';
import { SEQUENCE_KEYS } from '../../../../domain/repositories/crm.repository.js';
import {
  formatReference,
  nextSequence,
  toClient,
  writeAudit,
  type CrmPersistenceHost,
} from './crm-persistence.shared.js';

export class CrmClientPersistence {
  constructor(private readonly host: CrmPersistenceHost) {}

  private get prisma() {
    return this.host.prisma;
  }

  async listClients(organizationId: string): Promise<readonly ClientRecord[]> {
    const rows = await this.prisma.client.findMany({
      where: { organizationId, archivedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => toClient(row));
  }

  async getClient(organizationId: string, clientId: string): Promise<ClientRecord | null> {
    const row = await this.prisma.client.findFirst({
      where: { id: clientId, organizationId },
    });
    return row ? toClient(row) : null;
  }

  async createClient(
    organizationId: string,
    input: CreateClientInput,
    audit: CrmAuditInput,
  ): Promise<ClientRecord> {
    const clientId = crypto.randomUUID();
    const row = await this.prisma.$transaction(async (tx) => {
      const seq = await nextSequence(tx, organizationId, SEQUENCE_KEYS.client);
      const referenceNumber = formatReference('CL', seq);
      const client = await tx.client.create({
        data: {
          id: clientId,
          organizationId,
          referenceNumber,
          type: input.type,
          name: input.name,
          primaryContact: input.primaryContact ?? '',
          email: input.email ?? null,
          phone: input.phone ?? null,
          website: input.website ?? null,
          billingAddress: input.billingAddress ?? '',
          taxRegistration: input.taxRegistration ?? '',
          status: input.status ?? 'ACTIVE',
          notes: input.notes ?? '',
          sourceLeadId: input.sourceLeadId ?? null,
          createdByAdminId: input.createdByAdminId,
        },
      });
      await writeAudit(tx, organizationId, { ...audit, entityId: client.id });
      return client;
    });
    return toClient(row);
  }

  async updateClient(
    organizationId: string,
    clientId: string,
    input: UpdateClientInput,
    audit: CrmAuditInput,
  ): Promise<ClientRecord> {
    const existing = await this.host.getClient(organizationId, clientId);
    if (!existing) throw new CrmNotFoundError('Client');
    const row = await this.prisma.$transaction(async (tx) => {
      const client = await tx.client.update({
        where: { id: clientId },
        data: {
          type: input.type,
          name: input.name,
          primaryContact: input.primaryContact,
          email: input.email,
          phone: input.phone,
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
    return toClient(row);
  }

  previewClientReference(organizationId: string): Promise<string> {
    return this.prisma.organizationSequence
      .findUnique({
        where: { organizationId_key: { organizationId, key: SEQUENCE_KEYS.client } },
        select: { lastValue: true },
      })
      .then((row) => formatReference('CL', (row?.lastValue ?? 0) + 1));
  }

  async deleteClient(
    organizationId: string,
    clientId: string,
    audit: CrmAuditInput,
  ): Promise<void> {
    const existing = await this.host.getClient(organizationId, clientId);
    if (!existing) throw new CrmNotFoundError('Client');
    await this.prisma.$transaction(async (tx) => {
      await tx.lead.updateMany({
        where: { organizationId, convertedClientId: clientId },
        data: { convertedClientId: null, convertedAt: null },
      });
      await tx.client.delete({ where: { id: clientId } });
      await writeAudit(tx, organizationId, { ...audit, entityId: clientId });
    });
  }
}
