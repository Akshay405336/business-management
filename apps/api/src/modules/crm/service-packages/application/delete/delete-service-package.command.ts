import type { CrmActor } from '../../../application/shared/crm-actor.js';

export interface DeleteServicePackageCommand {
  readonly actor: CrmActor;
  readonly packageId: string;
}
