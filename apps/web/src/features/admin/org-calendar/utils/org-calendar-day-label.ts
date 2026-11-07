import type { OrgCalendarDayKind, OrgCalendarMonthDay } from '@techwin/contracts';
import { ORG_CALENDAR_DAY_KIND_LABEL } from '../constants/org-calendar-event-types';

export function resolveOrgCalendarDayStatusLabel(
  day: OrgCalendarMonthDay | undefined,
  fallback: OrgCalendarDayKind = 'WORKING',
): string {
  const kind = day?.dayKind ?? fallback;
  if (kind === 'SPECIAL_WORKING') {
    const hasOverride = day?.events.some((event) => event.eventType === 'SPECIAL_WORKING_DAY');
    if (hasOverride) return 'Working day';
  }
  return ORG_CALENDAR_DAY_KIND_LABEL[kind] ?? 'Working day';
}
