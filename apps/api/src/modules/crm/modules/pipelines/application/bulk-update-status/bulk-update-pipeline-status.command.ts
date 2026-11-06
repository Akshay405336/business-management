import type { PipelineStatus } from '../../domain/enums/pipeline-status.enum.js';
import type { CrmActor } from '../../../../shared/application/crm-actor.js';

export interface BulkUpdatePipelineStatusCommand {
  readonly actor: CrmActor;
  readonly pipelineIds: readonly string[];
  readonly status: PipelineStatus;
}
