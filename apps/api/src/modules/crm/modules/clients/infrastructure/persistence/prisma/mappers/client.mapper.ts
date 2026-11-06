import type { ClientReadModel } from '../../../../domain/types/client-read-model.js';

export function clientRowToReadModel(row: {
  id: string;
  organizationId: string;
  referenceNumber: string;
  type: ClientReadModel['type'];
  name: string;
  primaryContact: string;
  email: string | null;
  phone: string | null;
  phoneNormalized: string | null;
  website: string | null;
  billingAddress: string;
  taxRegistration: string;
  status: ClientReadModel['status'];
  notes: string;
  sourceLeadId: string | null;
  createdByAdminId: string;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): ClientReadModel {
  return {
    id: row.id,
    organizationId: row.organizationId,
    referenceNumber: row.referenceNumber,
    type: row.type,
    name: row.name,
    primaryContact: row.primaryContact,
    email: row.email,
    phone: row.phone,
    phoneNormalized: row.phoneNormalized,
    website: row.website,
    billingAddress: row.billingAddress,
    taxRegistration: row.taxRegistration,
    status: row.status,
    notes: row.notes,
    sourceLeadId: row.sourceLeadId,
    createdByAdminId: row.createdByAdminId,
    archivedAt: row.archivedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
