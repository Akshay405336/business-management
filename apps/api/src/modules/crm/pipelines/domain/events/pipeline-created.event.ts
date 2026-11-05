import type { PipelineDomainEventType } from '../enums/pipeline-event-type.enum.js';

export class PipelineCreatedEvent {
  readonly type: PipelineDomainEventType = 'PIPELINE_CREATED';

  constructor(
    readonly organizationId: string,
    readonly pipelineId: string,
    readonly occurredAt: Date = new Date(),
  ) {}
}
