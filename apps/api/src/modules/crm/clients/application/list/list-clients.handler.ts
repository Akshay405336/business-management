import { Inject, Injectable } from '@nestjs/common';
import {
  CLIENT_REPOSITORY,
  type ClientRepository,
} from '../../domain/repositories/client.repository.js';
import { resolveClientListPagination } from './client-list-pagination.js';
import type { ListClientsQuery } from './list-clients.query.js';
import type { ListClientsResult } from './list-clients.result.js';

@Injectable()
export class ListClientsHandler {
  constructor(@Inject(CLIENT_REPOSITORY) private readonly clients: ClientRepository) {}

  execute(query: ListClientsQuery): Promise<ListClientsResult> {
    const { actor, filters } = query;
    const pagination = resolveClientListPagination(filters);
    const createdFrom = filters.createdFrom
      ? new Date(`${filters.createdFrom}T00:00:00.000Z`)
      : undefined;
    const createdTo = filters.createdTo
      ? new Date(`${filters.createdTo}T23:59:59.999Z`)
      : undefined;
    return this.clients.list(actor.organizationId, {
      ...filters,
      createdFrom,
      createdTo,
      page: pagination.page,
      pageSize: pagination.pageSize,
    });
  }
}
