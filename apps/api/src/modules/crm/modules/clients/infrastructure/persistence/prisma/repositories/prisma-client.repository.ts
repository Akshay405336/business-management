import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../../../../infrastructure/database/prisma.service.js';
import type { ClientRepository } from '../../../../domain/repositories/client.repository.js';
import type { ClientReadModel } from '../../../../domain/types/client-read-model.js';
import type {
  ClientAuditEntry,
  ClientListFilters,
  CreateClientData,
  PaginatedClients,
  UpdateClientData,
} from '../../../../domain/types/client.types.js';
import {
  createClientRow,
  deleteClientRow,
  findClientByNormalizedPhone,
  getClientRow,
  listClientsPage,
  previewClientReference,
  updateClientRow,
} from '../client-prisma.store.js';

@Injectable()
export class PrismaClientRepository implements ClientRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string, filters: ClientListFilters): Promise<PaginatedClients> {
    return listClientsPage(this.prisma, organizationId, filters);
  }

  findById(organizationId: string, clientId: string): Promise<ClientReadModel | null> {
    return getClientRow(this.prisma, organizationId, clientId);
  }

  findByNormalizedPhone(
    organizationId: string,
    phoneNormalized: string,
  ): Promise<ClientReadModel | null> {
    return findClientByNormalizedPhone(this.prisma, organizationId, phoneNormalized);
  }

  previewNextReferenceNumber(organizationId: string): Promise<string> {
    return previewClientReference(this.prisma, organizationId);
  }

  create(
    organizationId: string,
    clientId: string,
    input: CreateClientData,
    audit: ClientAuditEntry,
  ): Promise<ClientReadModel> {
    return createClientRow(this.prisma, organizationId, clientId, input, audit);
  }

  update(
    organizationId: string,
    clientId: string,
    input: UpdateClientData,
    audit: ClientAuditEntry,
  ): Promise<ClientReadModel> {
    return updateClientRow(this.prisma, organizationId, clientId, input, audit);
  }

  delete(organizationId: string, clientId: string, audit: ClientAuditEntry): Promise<void> {
    return deleteClientRow(this.prisma, organizationId, clientId, audit);
  }
}
