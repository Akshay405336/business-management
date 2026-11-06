import { Inject, Injectable } from '@nestjs/common';
import { Client } from '../../domain/entities/client.entity.js';
import { ClientUpdatedEvent } from '../../domain/events/client-updated.event.js';
import {
  CLIENT_REPOSITORY,
  type ClientRepository,
} from '../../domain/repositories/client.repository.js';
import { clientAudit } from '../shared/client-audit.js';
import { requireClient } from '../shared/require-client.js';
import type { UpdateClientCommand } from './update-client.command.js';
import type { UpdateClientResult } from './update-client.result.js';

@Injectable()
export class UpdateClientHandler {
  constructor(@Inject(CLIENT_REPOSITORY) private readonly clients: ClientRepository) {}

  async execute(command: UpdateClientCommand): Promise<UpdateClientResult> {
    const { actor, clientId, input } = command;
    const existing = await this.clients.findById(actor.organizationId, clientId);
    requireClient(existing);
    const { archived, ...rest } = input;
    const patch = Client.validateUpdate({
      ...rest,
      archivedAt: archived === undefined ? undefined : archived ? new Date() : null,
    });
    const entity = Client.reconstitute(existing);
    const merged = entity.applyUpdate(patch);
    const client = await this.clients.update(
      actor.organizationId,
      clientId,
      {
        type: merged.type,
        name: merged.name,
        primaryContact: merged.primaryContact,
        email: merged.email,
        phone: merged.phone ?? undefined,
        phoneNormalized: merged.phoneNormalized ?? undefined,
        website: merged.website,
        billingAddress: merged.billingAddress,
        taxRegistration: merged.taxRegistration,
        status: merged.status,
        notes: merged.notes,
        archivedAt: merged.archivedAt,
      },
      clientAudit(actor, 'CLIENT_UPDATED', clientId),
    );
    void new ClientUpdatedEvent(actor.organizationId, clientId);
    return { client };
  }
}
