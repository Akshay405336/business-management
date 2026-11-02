import type { CrmActor } from '../shared/crm-actor.js';


export type GetServicePackageQuery = {
  readonly actor: CrmActor;
  readonly packageId: string;
};
