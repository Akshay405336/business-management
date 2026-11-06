import type { ClientReadModel } from '../types/client-read-model.js';
import type {
  ClientAuditEntry,
  ClientListFilters,
  CreateClientData,
  PaginatedClients,
  UpdateClientData,
} from '../types/client.types.js';

export const CLIENT_REPOSITORY = Symbol('CLIENT_REPOSITORY');

export interface ClientRepository {
  list(organizationId: string, filters: ClientListFilters): Promise<PaginatedClients>;
  findById(organizationId: string, clientId: string): Promise<ClientReadModel | null>;
  findByNormalizedPhone(
    organizationId: string,
    phoneNormalized: string,
  ): Promise<ClientReadModel | null>;
  previewNextReferenceNumber(organizationId: string): Promise<string>;
  create(
    organizationId: string,
    clientId: string,
    input: CreateClientData,
    audit: ClientAuditEntry,
  ): Promise<ClientReadModel>;
  update(
    organizationId: string,
    clientId: string,
    input: UpdateClientData,
    audit: ClientAuditEntry,
  ): Promise<ClientReadModel>;
  delete(organizationId: string, clientId: string, audit: ClientAuditEntry): Promise<void>;
}
