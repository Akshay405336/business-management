import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../../../../generated/prisma/client.js';
import { Client } from '../../../domain/entities/client.entity.js';
import type { LeadToClientConversionPort } from '../../../application/conversion/lead-to-client-conversion.port.js';
import type { ClientConversionTransaction } from '../../../application/conversion/lead-to-client-conversion.port.js';
import type { ClientReadModel } from '../../../domain/types/client-read-model.js';
import type { ClientAuditEntry, CreateClientData } from '../../../domain/types/client.types.js';
import { insertClientRowInTransaction } from './client-row.persistence.js';

@Injectable()
export class PrismaLeadToClientConversionAdapter implements LeadToClientConversionPort {
  createClientWithinTransaction(
    tx: ClientConversionTransaction,
    organizationId: string,
    clientId: string,
    input: CreateClientData,
    audit: ClientAuditEntry | null,
  ): Promise<ClientReadModel> {
    const validated = Client.validateCreate(input);
    return insertClientRowInTransaction(
      tx as Prisma.TransactionClient,
      organizationId,
      clientId,
      validated,
      audit,
    );
  }
}
