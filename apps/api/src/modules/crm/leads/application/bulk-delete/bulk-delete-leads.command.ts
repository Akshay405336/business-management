import type { CrmActor } from '../../../application/shared/crm-actor.js';

export interface BulkDeleteLeadsCommand {
  readonly actor: CrmActor;
  readonly leadIds: readonly string[];
}
