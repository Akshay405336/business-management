export const PipelineDomainEventTypes = [
  'PIPELINE_CREATED',
  'PIPELINE_UPDATED',
  'PIPELINE_DELETED',
  'PIPELINE_STATUS_CHANGED',
  'PIPELINE_STAGE_CREATED',
  'PIPELINE_STAGE_UPDATED',
  'PIPELINE_STAGE_DELETED',
  'PIPELINE_STAGES_REORDERED',
] as const;

export type PipelineDomainEventType = (typeof PipelineDomainEventTypes)[number];
