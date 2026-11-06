import { ClientValidationService } from '../services/client-validation.service.js';
import type { CreateClientData } from '../types/client.types.js';

export class ClientCreationPolicy {
  static validate(input: CreateClientData): CreateClientData {
    return ClientValidationService.normalizeCreate(input);
  }
}
