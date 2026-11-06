import { Inject, Injectable } from '@nestjs/common';
import { ClientDeletedEvent } from '../../domain/events/client-deleted.event.js';
import {
  CLIENT_REPOSITORY,
  type ClientRepository,
} from '../../domain/repositories/client.repository.js';
import { clientAudit } from '../shared/client-audit.js';
import type { DeleteClientCommand } from './delete-client.command.js';
import type { DeleteClientResult } from './delete-client.result.js';

@Injectable()
export class DeleteClientHandler {
  constructor(@Inject(CLIENT_REPOSITORY) private readonly clients: ClientRepository) {}

  async execute(command: DeleteClientCommand): Promise<DeleteClientResult> {
    const { actor, clientId } = command;
    await this.clients.delete(
      actor.organizationId,
      clientId,
      clientAudit(actor, 'CLIENT_DELETED', clientId),
    );
    void new ClientDeletedEvent(actor.organizationId, clientId);
    return { clientId };
  }
}
