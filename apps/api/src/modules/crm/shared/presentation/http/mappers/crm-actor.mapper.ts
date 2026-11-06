import type { CrmActor } from '../../../application/crm-actor.js';

export function toCrmActor(context: {
  readonly organizationId: string;
  readonly adminId: string;
}): CrmActor {
  return {
    organizationId: context.organizationId,
    adminId: context.adminId,
  };
}
