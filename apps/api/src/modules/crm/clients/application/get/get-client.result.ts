import type { ClientReadModel } from '../../domain/types/client-read-model.js';

export interface GetClientResult {
  readonly client: ClientReadModel;
}
