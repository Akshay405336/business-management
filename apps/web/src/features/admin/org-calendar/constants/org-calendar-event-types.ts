import type { OrgCalendarEventType } from '@techwin/contracts';

export const ORG_CALENDAR_EVENT_TYPE_OPTIONS: readonly {
  value: OrgCalendarEventType;
  label: string;
}[] = [
  { value: 'PUBLIC_HOLIDAY', label: 'Public Holiday' },
  { value: 'COMPANY_HOLIDAY', label: 'Company Holiday' },
  { value: 'FESTIVAL_REGIONAL', label: 'Festival / Regional Holiday' },
  { value: 'WEEKLY_OFF', label: 'Weekly Off' },
  { value: 'SPECIAL_WORKING_DAY', label: 'Special Working Day' },
  { value: 'HALF_WORKING_DAY', label: 'Half Working Day' },
  { value: 'OFFICE_CLOSURE', label: 'Office Closure' },
  { value: 'COMPANY_EVENT', label: 'Company Event' },
  { value: 'OPTIONAL_HOLIDAY', label: 'Optional Holiday' },
  { value: 'CUSTOM', label: 'Custom Event' },
];

export function labelForEventType(type: OrgCalendarEventType): string {
  return ORG_CALENDAR_EVENT_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

export const ORG_CALENDAR_DAY_KIND_LABEL: Record<string, string> = {
  WORKING: 'Working day',
  WEEKLY_OFF: 'Weekly off',
  NON_WORKING: 'Non-working day',
  HOLIDAY: 'Holiday',
  HALF_DAY: 'Half working day',
  SPECIAL_WORKING: 'Special working day',
  OFFICE_CLOSURE: 'Office closure',
};
