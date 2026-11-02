import type { CrmActor } from '../shared/crm-actor.js';

import type {
  PipelineStageOutcome,
  PipelineStatus,
} from '../../domain/crm-types.js';

export type UpdatePipelineStageCommand = {
  readonly actor: CrmActor;
  readonly pipelineId: string;
  readonly stageId: string;
  readonly input: {
    readonly name?: string;
    readonly description?: string;
    readonly color?: string;
    readonly status?: PipelineStatus;
    readonly outcome?: PipelineStageOutcome;
  };
};
