import type { PipelineDomainEventType } from '../enums/pipeline-event-type.enum.js';

export class PipelineDeletedEvent {
  readonly type: PipelineDomainEventType = 'PIPELINE_DELETED';

  constructor(
    readonly organizationId: string,
    readonly pipelineId: string,
    readonly occurredAt: Date = new Date(),
  ) {}
}
