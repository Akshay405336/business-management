import type { CrmActor } from '../crm-actor.js';

export interface BulkDeletePipelinesCommand {
  readonly actor: CrmActor;
  readonly pipelineIds: readonly string[];
}
