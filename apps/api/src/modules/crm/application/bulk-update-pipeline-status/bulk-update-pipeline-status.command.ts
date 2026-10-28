import type { PipelineStatus } from '../../domain/crm-types.js';
import type { CrmActor } from '../crm-actor.js';

export interface BulkUpdatePipelineStatusCommand {
  readonly actor: CrmActor;
  readonly pipelineIds: readonly string[];
  readonly status: PipelineStatus;
}
