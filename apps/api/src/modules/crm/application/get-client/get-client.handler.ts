import { Inject, Injectable } from '@nestjs/common';
import {
  CRM_REPOSITORY,
  type ClientRecord,
  type CrmRepository,
} from '../../domain/repositories/crm.repository.js';
import { requireCrmEntity } from '../shared/require-crm-entity.js';
import type { GetClientQuery } from './get-client.query.js';

@Injectable()
export class GetClientHandler {
  constructor(@Inject(CRM_REPOSITORY) private readonly crm: CrmRepository) {}

  execute(query: GetClientQuery): Promise<ClientRecord> {
    const { actor, clientId } = query;
    return requireCrmEntity(this.crm.getClient(actor.organizationId, clientId), 'Client');
  }
}
