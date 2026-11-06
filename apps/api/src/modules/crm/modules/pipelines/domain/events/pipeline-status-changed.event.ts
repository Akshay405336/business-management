import type { PipelineDomainEventType } from '../enums/pipeline-event-type.enum.js';
import type { PipelineStatus } from '../enums/pipeline-status.enum.js';

export class PipelineStatusChangedEvent {
  readonly type: PipelineDomainEventType = 'PIPELINE_STATUS_CHANGED';

  constructor(
    readonly organizationId: string,
    readonly pipelineId: string,
    readonly status: PipelineStatus,
    readonly occurredAt: Date = new Date(),
  ) {}
}
