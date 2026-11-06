import { Inject, Injectable } from '@nestjs/common';
import { Client } from '../../domain/entities/client.entity.js';
import { ClientCreatedEvent } from '../../domain/events/client-created.event.js';
import { CrmDuplicateClientPhoneError } from '../../../domain/errors/crm-client-phone.errors.js';
import {
  CLIENT_REPOSITORY,
  type ClientRepository,
} from '../../domain/repositories/client.repository.js';
import { clientAudit } from '../shared/client-audit.js';
import type { CreateClientCommand } from './create-client.command.js';
import type { CreateClientResult } from './create-client.result.js';

@Injectable()
export class CreateClientHandler {
  constructor(@Inject(CLIENT_REPOSITORY) private readonly clients: ClientRepository) {}

  async execute(command: CreateClientCommand): Promise<CreateClientResult> {
    const { actor, input } = command;
    const clientId = crypto.randomUUID();
    const validated = Client.validateCreate({
      ...input,
      createdByAdminId: actor.adminId,
    });
    const dup = await this.clients.findByNormalizedPhone(
      actor.organizationId,
      validated.phoneNormalized,
    );
    if (dup) {
      throw new CrmDuplicateClientPhoneError({
        id: dup.id,
        name: dup.name,
        referenceNumber: dup.referenceNumber,
        type: dup.type,
        phone: dup.phone,
      });
    }
    const client = await this.clients.create(
      actor.organizationId,
      clientId,
      validated,
      clientAudit(actor, 'CLIENT_CREATED', clientId),
    );
    void new ClientCreatedEvent(actor.organizationId, client.id);
    return { client };
  }
}
