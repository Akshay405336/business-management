import type { CrmActor } from '../../../application/shared/crm-actor.js';

export interface BulkDeletePipelinesCommand {
  readonly actor: CrmActor;
  readonly pipelineIds: readonly string[];
}
