import type { PipelineDomainEventType } from '../enums/pipeline-event-type.enum.js';

export class PipelineUpdatedEvent {
  readonly type: PipelineDomainEventType = 'PIPELINE_UPDATED';

  constructor(
    readonly organizationId: string,
    readonly pipelineId: string,
    readonly occurredAt: Date = new Date(),
  ) {}
}
