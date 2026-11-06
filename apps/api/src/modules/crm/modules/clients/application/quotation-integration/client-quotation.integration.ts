import type { ClientRepository } from '../../domain/repositories/client.repository.js';
import { ClientNotFoundError } from '../../domain/errors/client.errors.js';

export class ClientQuotationIntegration {
  static async assertClientExistsForQuotation(
    clients: ClientRepository,
    organizationId: string,
    clientId: string | null | undefined,
  ): Promise<void> {
    if (!clientId) return;
    const client = await clients.findById(organizationId, clientId);
    if (!client) {
      throw new ClientNotFoundError('Client');
    }
  }
}
