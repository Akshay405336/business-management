import type { CrmActor } from '../../../application/shared/crm-actor.js';

export interface GetServicePackageQuery {
  readonly actor: CrmActor;
  readonly packageId: string;
}
