import type { CrmActor } from '../../../../shared/application/crm-actor.js';

export interface BulkDeleteLeadsCommand {
  readonly actor: CrmActor;
  readonly leadIds: readonly string[];
}
