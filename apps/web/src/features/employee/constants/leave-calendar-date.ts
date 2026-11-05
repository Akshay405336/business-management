import type { OrgCalendarDayKind, OrgCalendarMonthDay } from '@techwin/contracts';
import { ORG_CALENDAR_DAY_KIND_LABEL } from '@/features/admin/org-calendar/constants/org-calendar-event-types';

const LEAVE_WORKING_KINDS: ReadonlySet<OrgCalendarDayKind> = new Set([
  'WORKING',
  'SPECIAL_WORKING',
  'HALF_DAY',
]);

export function isOrgDayEligibleForLeave(
  day: OrgCalendarMonthDay | undefined,
  _isHalfDay: boolean,
): boolean {
  if (!day) return false;
  return LEAVE_WORKING_KINDS.has(day.dayKind);
}

export function describeLeaveDateDisabledReason(input: {
  dateKey: string;
  day: OrgCalendarMonthDay | undefined;
  earliestEligibleStartDate: string | null;
  policyYearStartDate: string | null;
  policyYearEndDate: string | null;
  minDateKey: string | null;
}): string {
  const { dateKey, day, earliestEligibleStartDate, policyYearStartDate, policyYearEndDate, minDateKey } =
    input;

  if (policyYearStartDate && dateKey < policyYearStartDate) {
    return `Before the active leave policy start (${policyYearStartDate}).`;
  }
  if (policyYearEndDate && dateKey > policyYearEndDate) {
    return `After the active leave policy end (${policyYearEndDate}).`;
  }
  if (minDateKey && dateKey < minDateKey) {
    return 'End date cannot be before the start date.';
  }
  if (earliestEligibleStartDate && dateKey < earliestEligibleStartDate) {
    return `Before the earliest eligible start date (${earliestEligibleStartDate}).`;
  }
  if (day) {
    const label = ORG_CALENDAR_DAY_KIND_LABEL[day.dayKind] ?? 'Non-working day';
    if (!LEAVE_WORKING_KINDS.has(day.dayKind)) {
      return `${label} — not a working leave day.`;
    }
  }
  return 'This date is not available for leave selection.';
}

export function formatDateKeyForDisplay(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  if (!y || !m || !d) return dateKey;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function formatDateKeyShort(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  if (!y || !m || !d) return dateKey;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  });
}

export function normalizeSelectedDateKeys(dates: readonly string[]): string[] {
  return [...new Set(dates.filter(Boolean))].sort();
}

export function formatSelectedDatesCompactSummary(dates: readonly string[]): string {
  const sorted = normalizeSelectedDateKeys(dates);
  if (sorted.length === 0) return '';
  if (sorted.length <= 3) {
    return sorted.map(formatDateKeyShort).join(', ');
  }
  return `${sorted.slice(0, 2).map(formatDateKeyShort).join(', ')} +${sorted.length - 2} more`;
}

export function formatSelectedDatesFormSummary(dates: readonly string[]): string {
  const sorted = normalizeSelectedDateKeys(dates);
  if (sorted.length === 0) return '';
  const year = sorted[0]!.slice(0, 4);
  const sameYear = sorted.every((d) => d.startsWith(year));
  const parts = sorted.map((d) =>
    sameYear ? formatDateKeyShort(d) : formatDateKeyShort(d).concat(` ${d.slice(0, 4)}`),
  );
  return sameYear ? `${parts.join(', ')} ${year}` : parts.join(', ');
}
