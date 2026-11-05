import type { CrmActor } from '../../../application/shared/crm-actor.js';

import type { PipelineStageOutcome } from '../../domain/enums/pipeline-stage-outcome.enum.js';
import type { PipelineStatus } from '../../domain/enums/pipeline-status.enum.js';

export type CreatePipelineStageCommand = {
  readonly actor: CrmActor;
  readonly pipelineId: string;
  readonly input: {
    readonly name: string;
    readonly description?: string;
    readonly color?: string;
    readonly status?: PipelineStatus;
    readonly outcome?: PipelineStageOutcome;
  };
};
