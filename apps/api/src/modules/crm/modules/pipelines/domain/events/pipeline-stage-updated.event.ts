import type { PipelineDomainEventType } from '../enums/pipeline-event-type.enum.js';

export class PipelineStageUpdatedEvent {
  readonly type: PipelineDomainEventType = 'PIPELINE_STAGE_UPDATED';

  constructor(
    readonly organizationId: string,
    readonly pipelineId: string,
    readonly stageId: string,
    readonly occurredAt: Date = new Date(),
  ) {}
}
