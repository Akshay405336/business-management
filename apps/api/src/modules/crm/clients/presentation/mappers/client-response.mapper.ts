import type { CrmClient } from '@techwin/contracts';
import type { ClientReadModel } from '../../domain/types/client-read-model.js';

const iso = (value: Date): string => value.toISOString();

export function toCrmClient(client: ClientReadModel): CrmClient {
  return {
    id: client.id,
    referenceNumber: client.referenceNumber,
    type: client.type,
    name: client.name,
    primaryContact: client.primaryContact,
    email: client.email,
    phone: client.phone,
    website: client.website,
    billingAddress: client.billingAddress,
    taxRegistration: client.taxRegistration,
    status: client.status,
    notes: client.notes,
    sourceLeadId: client.sourceLeadId,
    archivedAt: client.archivedAt ? iso(client.archivedAt) : null,
    createdAt: iso(client.createdAt),
    updatedAt: iso(client.updatedAt),
  };
}
