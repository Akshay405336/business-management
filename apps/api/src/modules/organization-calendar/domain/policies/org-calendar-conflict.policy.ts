import type { OrgCalendarEventType } from '@techwin/contracts';
import type { OrgCalendarEventRecord } from '../types/org-calendar.types.js';
import { OrgCalendarConflictError } from '../errors/org-calendar.errors.js';

const HOLIDAY_LIKE: ReadonlySet<OrgCalendarEventType> = new Set([
  'PUBLIC_HOLIDAY',
  'COMPANY_HOLIDAY',
  'FESTIVAL_REGIONAL',
  'OFFICE_CLOSURE',
  'OPTIONAL_HOLIDAY',
  'WEEKLY_OFF',
]);

function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

export function assertNoCalendarConflicts(
  candidate: {
    eventType: OrgCalendarEventType;
    startDate: string;
    endDate: string;
    title: string;
  },
  existing: readonly OrgCalendarEventRecord[],
  excludeId?: string,
): void {
  const peers = existing.filter((e) => e.isActive && e.id !== excludeId);
  for (const other of peers) {
    if (!rangesOverlap(candidate.startDate, candidate.endDate, other.startDate, other.endDate)) {
      continue;
    }
    if (
      other.title.trim().toLowerCase() === candidate.title.trim().toLowerCase() &&
      other.eventType === candidate.eventType &&
      other.startDate === candidate.startDate
    ) {
      throw new OrgCalendarConflictError(
        'An event with the same title, type, and start date already exists.',
      );
    }
    const candidateSpecial = candidate.eventType === 'SPECIAL_WORKING_DAY';
    const candidateHoliday = HOLIDAY_LIKE.has(candidate.eventType);
    const otherSpecial = other.eventType === 'SPECIAL_WORKING_DAY';
    const otherHoliday = HOLIDAY_LIKE.has(other.eventType);
    if (candidateSpecial && otherHoliday) {
      throw new OrgCalendarConflictError(
        `Special working day overlaps with "${other.title}" (${other.eventType}). Adjust dates or remove the conflicting event first.`,
      );
    }
    if (candidateHoliday && otherSpecial) {
      throw new OrgCalendarConflictError(
        `Holiday/off day overlaps with special working day "${other.title}". Adjust dates or remove the special working day first.`,
      );
    }
  }
}
