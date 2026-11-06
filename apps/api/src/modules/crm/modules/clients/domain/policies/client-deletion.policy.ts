import { ClientConflictError } from '../errors/client.errors.js';
import type { ClientDependencyCounts } from '../types/client.types.js';

export class ClientDeletionPolicy {
  static assertCanDelete(counts: ClientDependencyCounts): void {
    if (counts.projectCount > 0) {
      throw new ClientConflictError(
        'This client cannot be deleted while projects are linked to it.',
      );
    }
    if (counts.quotationCount > 0) {
      throw new ClientConflictError(
        'This client cannot be deleted while quotations reference it.',
      );
    }
    if (counts.convertedLeadCount > 0) {
      throw new ClientConflictError(
        'This client cannot be deleted while it is linked to a converted lead.',
      );
    }
    if (counts.whatsAppContactCount > 0) {
      throw new ClientConflictError(
        'This client cannot be deleted while WhatsApp contacts reference it.',
      );
    }
  }
}
