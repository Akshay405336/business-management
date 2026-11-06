import type { CrmActor } from '../../../../shared/application/crm-actor.js';

export interface DeleteServicePackageCommand {
  readonly actor: CrmActor;
  readonly packageId: string;
}
