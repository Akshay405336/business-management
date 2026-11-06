export const LEAD_SOURCES = [
  'WEBSITE',
  'REFERRAL',
  'COLD_CALL',
  'EMAIL',
  'SOCIAL',
  'EVENT',
  'PARTNER',
  'OTHER',
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export function parseLeadSource(value: string): LeadSource {
  if ((LEAD_SOURCES as readonly string[]).includes(value)) {
    return value as LeadSource;
  }
  throw new Error(`Invalid lead source: ${value}`);
}
