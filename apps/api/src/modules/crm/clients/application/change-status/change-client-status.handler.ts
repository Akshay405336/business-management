import { Inject, Injectable } from '@nestjs/common';
import { Client } from '../../domain/entities/client.entity.js';
import { ClientStatusChangedEvent } from '../../domain/events/client-status-changed.event.js';
import {
  CLIENT_REPOSITORY,
  type ClientRepository,
} from '../../domain/repositories/client.repository.js';
import { clientAudit } from '../shared/client-audit.js';
import { requireClient } from '../shared/require-client.js';
import type { ChangeClientStatusCommand } from './change-client-status.command.js';
import type { ChangeClientStatusResult } from './change-client-status.result.js';

@Injectable()
export class ChangeClientStatusHandler {
  constructor(@Inject(CLIENT_REPOSITORY) private readonly clients: ClientRepository) {}

  async execute(command: ChangeClientStatusCommand): Promise<ChangeClientStatusResult> {
    const { actor, clientId, status } = command;
    const existing = await this.clients.findById(actor.organizationId, clientId);
    requireClient(existing);
    const entity = Client.reconstitute(existing).withStatus(status);
    const client = await this.clients.update(
      actor.organizationId,
      clientId,
      { status: entity.status },
      clientAudit(actor, 'CLIENT_UPDATED', clientId, {
        statusChange: true,
        fromStatus: existing.status,
        toStatus: status,
      }),
    );
    void new ClientStatusChangedEvent(
      actor.organizationId,
      clientId,
      existing.status,
      status,
    );
    return { client };
  }
}
