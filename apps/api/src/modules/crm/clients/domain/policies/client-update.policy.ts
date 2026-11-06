import { ClientValidationService } from '../services/client-validation.service.js';
import type { UpdateClientData } from '../types/client.types.js';

export class ClientUpdatePolicy {
  static validatePatch(input: UpdateClientData): UpdateClientData {
    return ClientValidationService.normalizeUpdate(input);
  }
}
