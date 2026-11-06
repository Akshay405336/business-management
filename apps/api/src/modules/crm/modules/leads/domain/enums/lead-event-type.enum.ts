export const LEAD_DOMAIN_EVENT_TYPES = [
  'LEAD_CREATED',
  'LEAD_UPDATED',
  'LEAD_STAGE_CHANGED',
  'LEAD_CONVERTED',
  'LEAD_DELETED',
] as const;

export type LeadDomainEventType = (typeof LEAD_DOMAIN_EVENT_TYPES)[number];
