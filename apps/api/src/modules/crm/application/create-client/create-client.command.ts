import type { CrmActor } from '../shared/crm-actor.js';
import type { ClientStatus, ClientType } from '../../domain/crm-types.js';

export type CreateClientCommand = {
  readonly actor: CrmActor;
  readonly input: {
    readonly type: ClientType;
    readonly name: string;
    readonly primaryContact?: string;
    readonly email?: string | null;
    readonly phone?: string | null;
    readonly website?: string | null;
    readonly billingAddress?: string;
    readonly taxRegistration?: string;
    readonly status?: ClientStatus;
    readonly notes?: string;
    readonly sourceLeadId?: string | null;
  };
};
