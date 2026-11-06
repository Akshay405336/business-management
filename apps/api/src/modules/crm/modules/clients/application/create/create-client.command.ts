import type { CrmActor } from '../../../../shared/application/crm-actor.js';
import type { CreateClientData } from '../../domain/types/client.types.js';

export interface CreateClientCommand {
  readonly actor: CrmActor;
  readonly input: Omit<CreateClientData, 'createdByAdminId'>;
}
