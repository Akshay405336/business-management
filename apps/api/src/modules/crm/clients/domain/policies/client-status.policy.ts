import { ClientValidationError } from '../errors/client.errors.js';
import type { ClientStatus } from '../enums/client-status.enum.js';
import { CLIENT_STATUSES } from '../enums/client-status.enum.js';

export class ClientStatusPolicy {
  /** ACTIVE and INACTIVE are both terminal states; direct transitions are allowed. */
  static assertTransition(_current: ClientStatus, next: ClientStatus): void {
    if (!CLIENT_STATUSES.includes(next)) {
      throw new ClientValidationError('Unsupported client status.');
    }
  }
}
