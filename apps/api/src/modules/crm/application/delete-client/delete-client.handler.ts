import { Inject, Injectable } from '@nestjs/common';
import {
  CRM_REPOSITORY,
  type CrmRepository,
} from '../../domain/repositories/crm.repository.js';
import type { DeleteClientCommand } from './delete-client.command.js';

@Injectable()
export class DeleteClientHandler {
  constructor(@Inject(CRM_REPOSITORY) private readonly crm: CrmRepository) {}

  execute(command: DeleteClientCommand): Promise<void> {
    const { actor, clientId } = command;
    return this.crm.deleteClient(actor.organizationId, clientId, {
      type: 'CLIENT_UPDATED',
      adminId: actor.adminId,
      entityType: 'client',
      entityId: clientId,
      metadata: { deleted: true },
    });
  }
}
