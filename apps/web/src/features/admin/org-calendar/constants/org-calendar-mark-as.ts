import type { OrgCalendarEventType } from '@techwin/contracts';

export type OrgCalendarMarkAs =
  | 'WORKING'
  | 'WEEKLY_OFF'
  | 'PUBLIC_HOLIDAY'
  | 'COMPANY_HOLIDAY'
  | 'SPECIAL_WORKING_DAY'
  | 'HALF_WORKING_DAY';

export const ORG_CALENDAR_MARK_AS_OPTIONS: readonly {
  value: OrgCalendarMarkAs;
  label: string;
  eventType?: OrgCalendarEventType;
}[] = [
  { value: 'WORKING', label: 'Working day' },
  { value: 'WEEKLY_OFF', label: 'Weekly off', eventType: 'WEEKLY_OFF' },
  { value: 'PUBLIC_HOLIDAY', label: 'Public holiday', eventType: 'PUBLIC_HOLIDAY' },
  { value: 'COMPANY_HOLIDAY', label: 'Company holiday', eventType: 'COMPANY_HOLIDAY' },
  { value: 'SPECIAL_WORKING_DAY', label: 'Special working day', eventType: 'SPECIAL_WORKING_DAY' },
  { value: 'HALF_WORKING_DAY', label: 'Half working day', eventType: 'HALF_WORKING_DAY' },
];

/** Options shown in the date-type dropdown (schedule-driven types are excluded). */
export const ORG_CALENDAR_MARK_AS_DROPDOWN_OPTIONS = ORG_CALENDAR_MARK_AS_OPTIONS.filter(
  (opt) => opt.value !== 'SPECIAL_WORKING_DAY',
);

export function isOrgCalendarMarkAsDropdownValue(markAs: OrgCalendarMarkAs): boolean {
  return ORG_CALENDAR_MARK_AS_DROPDOWN_OPTIONS.some((opt) => opt.value === markAs);
}

/** Event types that define day classification (excludes company events / custom). */
export const ORG_CALENDAR_CLASSIFICATION_EVENT_TYPES: readonly OrgCalendarEventType[] = [
  'PUBLIC_HOLIDAY',
  'COMPANY_HOLIDAY',
  'FESTIVAL_REGIONAL',
  'WEEKLY_OFF',
  'SPECIAL_WORKING_DAY',
  'HALF_WORKING_DAY',
  'OFFICE_CLOSURE',
  'OPTIONAL_HOLIDAY',
];

export function defaultTitleForMarkAs(markAs: OrgCalendarMarkAs): string {
  return ORG_CALENDAR_MARK_AS_OPTIONS.find((o) => o.value === markAs)?.label ?? 'Calendar exception';
}

export function markAsFromDayEvents(
  dayKind: string,
  events: readonly { eventType: OrgCalendarEventType }[],
): OrgCalendarMarkAs {
  const classification = events.find((e) =>
    ORG_CALENDAR_CLASSIFICATION_EVENT_TYPES.includes(e.eventType),
  );
  if (classification) {
    const match = ORG_CALENDAR_MARK_AS_OPTIONS.find((o) => o.eventType === classification.eventType);
    if (match) return match.value;
  }
  if (dayKind === 'HALF_DAY') return 'HALF_WORKING_DAY';
  if (dayKind === 'SPECIAL_WORKING') return 'SPECIAL_WORKING_DAY';
  if (dayKind === 'WEEKLY_OFF') return 'WEEKLY_OFF';
  if (dayKind === 'NON_WORKING') return 'WORKING';
  if (dayKind === 'HOLIDAY' || dayKind === 'OFFICE_CLOSURE') return 'PUBLIC_HOLIDAY';
  return 'WORKING';
}
