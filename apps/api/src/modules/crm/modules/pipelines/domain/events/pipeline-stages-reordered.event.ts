import type { PipelineDomainEventType } from '../enums/pipeline-event-type.enum.js';

export class PipelineStagesReorderedEvent {
  readonly type: PipelineDomainEventType = 'PIPELINE_STAGES_REORDERED';

  constructor(
    readonly organizationId: string,
    readonly pipelineId: string,
    readonly orderedStageIds: readonly string[],
    readonly occurredAt: Date = new Date(),
  ) {}
}
