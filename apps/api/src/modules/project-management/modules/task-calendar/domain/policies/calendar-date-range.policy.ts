import { BadRequestException } from '@nestjs/common';
import type { CalendarDateRange } from '../value-objects/calendar-date-range.vo.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGE_DAYS = 120;

function parseUtcDateOnly(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

function dayDiffInclusive(start: string, end: string): number {
  const a = parseUtcDateOnly(start).getTime();
  const b = parseUtcDateOnly(end).getTime();
  return Math.floor((b - a) / 86_400_000) + 1;
}

/** Validates ISO date-only strings and inclusive span limits for calendar queries. */
export function assertValidCalendarDateRange(range: CalendarDateRange): void {
  if (!DATE_RE.test(range.startDate) || !DATE_RE.test(range.endDate)) {
    throw new BadRequestException('startDate and endDate must be valid YYYY-MM-DD values.');
  }
  if (range.startDate > range.endDate) {
    throw new BadRequestException('startDate must be on or before endDate.');
  }
  const span = dayDiffInclusive(range.startDate, range.endDate);
  if (span > MAX_RANGE_DAYS) {
    throw new BadRequestException(`Date range cannot exceed ${MAX_RANGE_DAYS} days.`);
  }
}
