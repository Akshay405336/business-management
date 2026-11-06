import type { PipelineStatus } from '../../domain/enums/pipeline-status.enum.js';
import type { CrmActor } from '../../../../shared/application/crm-actor.js';

export interface UpdatePipelineStatusCommand {
  readonly actor: CrmActor;
  readonly pipelineId: string;
  readonly status: PipelineStatus;
}
