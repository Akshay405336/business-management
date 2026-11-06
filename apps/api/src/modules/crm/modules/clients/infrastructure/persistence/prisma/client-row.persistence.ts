import type { Prisma } from '../../../../../../../generated/prisma/client.js';
import type { CrmAuditInput } from '../../../../../shared/domain/repositories/crm.repository.js';
import { writeAudit } from '../../../../../shared/infrastructure/persistence/prisma/repositories/crm-persistence.shared.js';
import type { ClientReadModel } from '../../../domain/types/client-read-model.js';
import type { ClientAuditEntry, CreateClientData } from '../../../domain/types/client.types.js';
import { allocateClientReferenceNumber } from './client-reference-allocation.js';
import { clientRowToReadModel } from './mappers/client.mapper.js';

export async function insertClientRowInTransaction(
  tx: Prisma.TransactionClient,
  organizationId: string,
  clientId: string,
  input: CreateClientData,
  audit: ClientAuditEntry | null,
): Promise<ClientReadModel> {
  const referenceNumber = await allocateClientReferenceNumber(tx, organizationId);
  const client = await tx.client.create({
    data: {
      id: clientId,
      organizationId,
      referenceNumber,
      type: input.type,
      name: input.name,
      primaryContact: input.primaryContact ?? '',
      email: input.email ?? null,
      phone: input.phone,
      phoneNormalized: input.phoneNormalized,
      website: input.website ?? null,
      billingAddress: input.billingAddress ?? '',
      taxRegistration: input.taxRegistration ?? '',
      status: input.status ?? 'ACTIVE',
      notes: input.notes ?? '',
      sourceLeadId: input.sourceLeadId ?? null,
      createdByAdminId: input.createdByAdminId,
    },
  });
  if (audit) {
    await writeAudit(tx, organizationId, { ...(audit as CrmAuditInput), entityId: client.id });
  }
  return clientRowToReadModel(client);
}
