import type { CrmActor } from '../../../../shared/application/crm-actor.js';

export interface BulkDeletePipelinesCommand {
  readonly actor: CrmActor;
  readonly pipelineIds: readonly string[];
}
