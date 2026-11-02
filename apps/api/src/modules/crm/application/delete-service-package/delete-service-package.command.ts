import type { CrmActor } from '../shared/crm-actor.js';


export type DeleteServicePackageCommand = {
  readonly actor: CrmActor;
  readonly packageId: string;
};
