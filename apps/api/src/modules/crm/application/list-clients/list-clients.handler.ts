import { Inject, Injectable } from '@nestjs/common';
import {
  CRM_REPOSITORY,
  type ClientRecord,
  type CrmRepository,
} from '../../domain/repositories/crm.repository.js';
import type { ListClientsQuery } from './list-clients.query.js';

@Injectable()
export class ListClientsHandler {
  constructor(@Inject(CRM_REPOSITORY) private readonly crm: CrmRepository) {}

  execute(query: ListClientsQuery): Promise<readonly ClientRecord[]> {
    return this.crm.listClients(query.actor.organizationId);
  }
}
