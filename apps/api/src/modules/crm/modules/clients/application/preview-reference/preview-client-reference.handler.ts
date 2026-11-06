import { Inject, Injectable } from '@nestjs/common';
import {
  CLIENT_REPOSITORY,
  type ClientRepository,
} from '../../domain/repositories/client.repository.js';
import type { PreviewClientReferenceQuery } from './preview-client-reference.query.js';

@Injectable()
export class PreviewClientReferenceHandler {
  constructor(@Inject(CLIENT_REPOSITORY) private readonly clients: ClientRepository) {}

  execute(query: PreviewClientReferenceQuery): Promise<string> {
    return this.clients.previewNextReferenceNumber(query.actor.organizationId);
  }
}
