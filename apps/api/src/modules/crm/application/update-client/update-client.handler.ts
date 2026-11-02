import { Inject, Injectable } from '@nestjs/common';
import {
  CRM_REPOSITORY,
  type ClientRecord,
  type CrmRepository,
} from '../../domain/repositories/crm.repository.js';
import type { UpdateClientCommand } from './update-client.command.js';

@Injectable()
export class UpdateClientHandler {
  constructor(@Inject(CRM_REPOSITORY) private readonly crm: CrmRepository) {}

  execute(command: UpdateClientCommand): Promise<ClientRecord> {
    const { actor, clientId, input } = command;
    const { archived, ...rest } = input;
    return this.crm.updateClient(
      actor.organizationId,
      clientId,
      {
        ...rest,
        archivedAt: archived === undefined ? undefined : archived ? new Date() : null,
      },
      {
        type: 'CLIENT_UPDATED',
        adminId: actor.adminId,
        entityType: 'client',
        entityId: clientId,
      },
    );
  }
}
