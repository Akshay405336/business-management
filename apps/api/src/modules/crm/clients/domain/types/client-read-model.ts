import type { ClientStatus } from '../enums/client-status.enum.js';
import type { ClientType } from '../enums/client-type.enum.js';

export interface ClientReadModel {
  readonly id: string;
  readonly organizationId: string;
  readonly referenceNumber: string;
  readonly type: ClientType;
  readonly name: string;
  readonly primaryContact: string;
  readonly email: string | null;
  readonly phone: string | null;
  readonly phoneNormalized: string | null;
  readonly website: string | null;
  readonly billingAddress: string;
  readonly taxRegistration: string;
  readonly status: ClientStatus;
  readonly notes: string;
  readonly sourceLeadId: string | null;
  readonly createdByAdminId: string;
  readonly archivedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/** @deprecated Use ClientReadModel — kept for lead conversion and CRM facade compatibility. */
export type ClientRecord = ClientReadModel;
