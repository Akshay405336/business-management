import type { CrmActor } from '../../../../shared/application/crm-actor.js';
import type { ClientStatus } from '../../domain/enums/client-status.enum.js';

export interface ChangeClientStatusCommand {
  readonly actor: CrmActor;
  readonly clientId: string;
  readonly status: ClientStatus;
}
