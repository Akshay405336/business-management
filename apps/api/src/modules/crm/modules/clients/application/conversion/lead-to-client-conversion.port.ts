import type { ClientReadModel } from '../../domain/types/client-read-model.js';
import type { ClientAuditEntry, CreateClientData } from '../../domain/types/client.types.js';

export const LEAD_TO_CLIENT_CONVERSION = Symbol('LEAD_TO_CLIENT_CONVERSION');

/** Opaque persistence transaction (Prisma transaction client in infrastructure). */
export type ClientConversionTransaction = unknown;

export interface LeadToClientConversionPort {
  createClientWithinTransaction(
    tx: ClientConversionTransaction,
    organizationId: string,
    clientId: string,
    input: CreateClientData,
    audit: ClientAuditEntry | null,
  ): Promise<ClientReadModel>;
}
