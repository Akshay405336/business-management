import { Inject, Injectable } from '@nestjs/common';
import {
  CRM_REPOSITORY,
  type ClientRecord,
  type CrmRepository,
} from '../../domain/repositories/crm.repository.js';
import type { CreateClientCommand } from './create-client.command.js';

@Injectable()
export class CreateClientHandler {
  constructor(@Inject(CRM_REPOSITORY) private readonly crm: CrmRepository) {}

  execute(command: CreateClientCommand): Promise<ClientRecord> {
    const { actor, input } = command;
    const clientId = crypto.randomUUID();
    return this.crm.createClient(
      actor.organizationId,
      { ...input, createdByAdminId: actor.adminId },
      {
        type: 'CLIENT_CREATED',
        adminId: actor.adminId,
        entityType: 'client',
        entityId: clientId,
      },
    );
  }
}
