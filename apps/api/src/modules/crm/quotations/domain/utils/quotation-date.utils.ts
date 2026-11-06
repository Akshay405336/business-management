/** UTC date-only string (YYYY-MM-DD) for comparisons aligned with API date fields. */
export function toUtcDateOnlyString(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function utcDateOnlyToDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

export function addUtcCalendarDays(isoDate: string, days: number): string {
  const date = utcDateOnlyToDate(isoDate);
  date.setUTCDate(date.getUTCDate() + days);
  return toUtcDateOnlyString(date);
}

/** True when the validity date is strictly before today (UTC date-only). */
export function isQuotationPastExpiry(expiryDate: Date | null | undefined, now = new Date()): boolean {
  if (!expiryDate) return false;
  return toUtcDateOnlyString(expiryDate) < toUtcDateOnlyString(now);
}

/** Prisma filter: expiry date before the start of today (UTC). */
export function expiryBeforeTodayUtc(now = new Date()): Date {
  return utcDateOnlyToDate(toUtcDateOnlyString(now));
}
