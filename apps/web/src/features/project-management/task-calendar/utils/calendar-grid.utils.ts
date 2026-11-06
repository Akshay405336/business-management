import { localDateInputValue, parseMonthKey } from './calendar-date.utils';

export type CalendarGridCell = {
  readonly date: string;
  readonly inMonth: boolean;
};

/** Full weeks (Sun–Sat) covering `monthKey` (YYYY-MM). */
export function buildMonthGrid(monthKey: string): CalendarGridCell[] {
  const parsed = parseMonthKey(monthKey);
  if (!parsed) return [];
  const first = new Date(parsed.year, parsed.monthIndex, 1);
  const last = new Date(parsed.year, parsed.monthIndex + 1, 0);
  const startPad = first.getDay();
  const endPad = 6 - last.getDay();
  const total = last.getDate() + startPad + endPad;
  const cells: CalendarGridCell[] = [];
  let cursor = new Date(parsed.year, parsed.monthIndex, 1 - startPad);
  for (let i = 0; i < total; i += 1) {
    const date = localDateInputValue(cursor);
    const inMonth = cursor.getMonth() === parsed.monthIndex;
    cells.push({ date, inMonth });
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
  }
  return cells;
}
