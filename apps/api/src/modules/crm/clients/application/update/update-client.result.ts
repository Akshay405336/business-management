import type { ClientReadModel } from '../../domain/types/client-read-model.js';

export interface UpdateClientResult {
  readonly client: ClientReadModel;
}
