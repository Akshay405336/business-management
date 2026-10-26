const MS_PER_DAY = 86_400_000;

function parseDateOnlyUtc(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

export function calendarDaysBetween(startIso: string, endIso: string): number {
  const start = parseDateOnlyUtc(startIso).getTime();
  const end = parseDateOnlyUtc(endIso).getTime();
  return Math.round((end - start) / MS_PER_DAY);
}

export function formatElapsedCalendarDays(fromIso: string, toIso: string): string {
  const days = calendarDaysBetween(fromIso.slice(0, 10), toIso.slice(0, 10));
  if (days <= 0) return 'Less than 1 calendar day';
  if (days === 1) return '1 calendar day';
  return `${days} calendar days`;
}

/** Positive = finished late; negative = ahead of planned end (calendar days). */
export function projectCompletionVarianceDays(
  expectedEndDate: string,
  actualCompletedAt: string,
): number {
  return calendarDaysBetween(expectedEndDate, actualCompletedAt.slice(0, 10));
}

export function describeScheduleVarianceDays(varianceDays: number): string {
  if (varianceDays === 0) return 'On schedule';
  if (varianceDays > 0) {
    return `${varianceDays} calendar day${varianceDays === 1 ? '' : 's'} late`;
  }
  const ahead = Math.abs(varianceDays);
  return `${ahead} calendar day${ahead === 1 ? '' : 's'} ahead`;
}
