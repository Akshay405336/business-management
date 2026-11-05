import type { PipelineDomainEventType } from '../enums/pipeline-event-type.enum.js';

export class PipelineStageCreatedEvent {
  readonly type: PipelineDomainEventType = 'PIPELINE_STAGE_CREATED';

  constructor(
    readonly organizationId: string,
    readonly pipelineId: string,
    readonly stageId: string,
    readonly occurredAt: Date = new Date(),
  ) {}
}
