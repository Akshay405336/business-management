/** ISO calendar date (YYYY-MM-DD) — pure parsing for domain policies (no DB). */
export function parseIsoDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function isoDateOnlyFromDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}
