import { ClientNotFoundError } from '../../domain/errors/client.errors.js';
import type { ClientReadModel } from '../../domain/types/client-read-model.js';

export function requireClient(
  client: ClientReadModel | null,
): asserts client is ClientReadModel {
  if (!client) {
    throw new ClientNotFoundError('Client');
  }
}
