import type { CrmActor } from '../../../application/shared/crm-actor.js';
import type { CreateClientData } from '../../domain/types/client.types.js';

export interface CreateClientCommand {
  readonly actor: CrmActor;
  readonly input: Omit<CreateClientData, 'createdByAdminId'>;
}
