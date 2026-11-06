export const LEAD_ACTIVITY_TYPES = [
  'FIRST_CALL',
  'FOLLOW_UP_CALL',
  'MEETING',
  'EMAIL',
  'NOTE',
  'TASK',
  'STAGE_CHANGE',
  'PROPOSAL_CREATED',
  'PROPOSAL_STATUS_CHANGE',
  'LEAD_CONVERTED',
  'LEAD_LINKED_TO_CLIENT',
] as const;
export type LeadActivityType = (typeof LEAD_ACTIVITY_TYPES)[number];

export function parseLeadActivityType(value: string): LeadActivityType {
  if ((LEAD_ACTIVITY_TYPES as readonly string[]).includes(value)) {
    return value as LeadActivityType;
  }
  throw new Error(`Invalid lead activity type: ${value}`);
}
