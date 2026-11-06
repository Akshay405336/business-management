import { Inject, Injectable } from '@nestjs/common';
import {
  CLIENT_REPOSITORY,
  type ClientRepository,
} from '../../domain/repositories/client.repository.js';
import { requireClient } from '../shared/require-client.js';
import type { GetClientQuery } from './get-client.query.js';
import type { GetClientResult } from './get-client.result.js';

@Injectable()
export class GetClientHandler {
  constructor(@Inject(CLIENT_REPOSITORY) private readonly clients: ClientRepository) {}

  async execute(query: GetClientQuery): Promise<GetClientResult> {
    const client = await this.clients.findById(query.actor.organizationId, query.clientId);
    requireClient(client);
    return { client };
  }
}
