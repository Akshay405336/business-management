export const LEAD_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export type LeadPriority = (typeof LEAD_PRIORITIES)[number];

export function parseLeadPriority(value: string): LeadPriority {
  if ((LEAD_PRIORITIES as readonly string[]).includes(value)) {
    return value as LeadPriority;
  }
  throw new Error(`Invalid lead priority: ${value}`);
}
