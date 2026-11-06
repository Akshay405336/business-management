import type { CrmActor } from '../../../../shared/application/crm-actor.js';
import type { UpdateClientData } from '../../domain/types/client.types.js';

export interface UpdateClientCommand {
  readonly actor: CrmActor;
  readonly clientId: string;
  readonly input: UpdateClientData & { readonly archived?: boolean };
}
