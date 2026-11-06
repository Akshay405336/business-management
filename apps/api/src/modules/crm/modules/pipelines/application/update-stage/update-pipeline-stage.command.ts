import type { CrmActor } from '../../../../shared/application/crm-actor.js';

import type { PipelineStageOutcome } from '../../domain/enums/pipeline-stage-outcome.enum.js';
import type { PipelineStatus } from '../../domain/enums/pipeline-status.enum.js';

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
