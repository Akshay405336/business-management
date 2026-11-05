function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function dateKeyFromDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDaysToDateKey(dateKey: string, days: number): string {
  const d = parseDateOnly(dateKey);
  d.setUTCDate(d.getUTCDate() + days);
  return dateKeyFromDate(d);
}

export function normalizeLeaveDateKeys(dates: readonly string[]): string[] {
  return [...new Set(dates.map((d) => d.trim()).filter(Boolean))].sort();
}

export function expandInclusiveCalendarRange(startDate: string, endDate: string): string[] {
  const out: string[] = [];
  let cursor = startDate;
  while (cursor <= endDate) {
    out.push(cursor);
    cursor = addDaysToDateKey(cursor, 1);
  }
  return out;
}

export type ResolvedLeaveRequestDates = {
  readonly selectedDates: readonly string[];
  readonly startDate: string;
  readonly endDate: string;
  readonly halfDayDate: string | null;
};

export function resolveLeaveRequestDates(input: {
  selectedDates?: readonly string[] | undefined;
  startDate?: string | undefined;
  endDate?: string | undefined;
  isHalfDay: boolean;
  halfDayDate?: string | null | undefined;
}): ResolvedLeaveRequestDates {
  const explicit = input.selectedDates?.length
    ? normalizeLeaveDateKeys(input.selectedDates)
    : null;

  const selectedDates =
    explicit ??
    (input.startDate && input.endDate
      ? expandInclusiveCalendarRange(input.startDate, input.endDate)
      : []);

  if (selectedDates.length === 0) {
    throw new Error('At least one leave date is required.');
  }

  const startDate = selectedDates[0]!;
  const endDate = selectedDates[selectedDates.length - 1]!;

  let halfDayDate: string | null = null;
  if (input.isHalfDay) {
    if (input.halfDayDate) {
      halfDayDate = input.halfDayDate;
    } else if (selectedDates.length === 1) {
      halfDayDate = selectedDates[0]!;
    }
  }

  return { selectedDates, startDate, endDate, halfDayDate };
}
