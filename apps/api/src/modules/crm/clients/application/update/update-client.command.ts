import type { CrmActor } from '../../../application/shared/crm-actor.js';
import type { UpdateClientData } from '../../domain/types/client.types.js';

export interface UpdateClientCommand {
  readonly actor: CrmActor;
  readonly clientId: string;
  readonly input: UpdateClientData & { readonly archived?: boolean };
}
