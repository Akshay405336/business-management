import type { CrmActor } from '../../../../shared/application/crm-actor.js';

export interface GetServicePackageQuery {
  readonly actor: CrmActor;
  readonly packageId: string;
}
