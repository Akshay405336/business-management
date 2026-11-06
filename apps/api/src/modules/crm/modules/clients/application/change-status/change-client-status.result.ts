import type { ClientReadModel } from '../../domain/types/client-read-model.js';

export interface ChangeClientStatusResult {
  readonly client: ClientReadModel;
}
