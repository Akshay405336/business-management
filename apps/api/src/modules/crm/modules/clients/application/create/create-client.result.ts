import type { ClientReadModel } from '../../domain/types/client-read-model.js';

export interface CreateClientResult {
  readonly client: ClientReadModel;
}
