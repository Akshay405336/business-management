import type { PipelineStatus } from '../../domain/crm-types.js';
import type { CrmActor } from '../shared/crm-actor.js';

export interface UpdatePipelineStatusCommand {
  readonly actor: CrmActor;
  readonly pipelineId: string;
  readonly status: PipelineStatus;
}
